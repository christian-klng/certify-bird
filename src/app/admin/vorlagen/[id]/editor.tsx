"use client";

import type { Designer } from "@pdfme/ui";
import { useEffect, useRef, useState } from "react";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  PLACEHOLDERS,
  type Design,
} from "@/lib/certificates/design";
import { certificatePlugins } from "@/lib/certificates/plugins";

type Status = { tone: "info" | "error"; text: string } | null;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Editor für eine Vorlage: Name, Beschreibung und die Gestaltung mit pdfme. */
export function TemplateEditor(props: {
  id: string;
  name: string;
  description: string;
  design: Design;
}) {
  const container = useRef<HTMLDivElement>(null);
  const designer = useRef<Designer | null>(null);
  const initialDesign = useRef(props.design);
  const [name, setName] = useState(props.name);
  const [description, setDescription] = useState(props.description);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    let cancelled = false;
    // Der Editor braucht den Browser und ist groß: erst hier nachladen.
    import("@pdfme/ui").then(({ Designer }) => {
      if (cancelled || !container.current) return;
      const instance = new Designer({
        domContainer: container.current,
        template: initialDesign.current,
        plugins: certificatePlugins,
        options: {
          lang: "de",
          theme: { token: { colorPrimary: "#1f7fc0" } },
        },
      });
      instance.onChangeTemplate(() => setDirty(true));
      designer.current = instance;
      setReady(true);
    });
    return () => {
      cancelled = true;
      designer.current?.destroy();
      designer.current = null;
    };
  }, []);

  // Warnung beim Verlassen der Seite mit ungespeicherten Änderungen.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (!designer.current) return;
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/admin/vorlagen/${props.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, design: designer.current.getTemplate() }),
      });
      if (response.ok) {
        setDirty(false);
        setStatus({ tone: "info", text: "Gespeichert." });
      } else {
        setStatus({ tone: "error", text: (await response.text()) || "Speichern fehlgeschlagen." });
      }
    } catch {
      setStatus({ tone: "error", text: "Keine Verbindung zum Server." });
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    if (!designer.current) return;
    // Das Fenster sofort öffnen: Nach dem Warten würde der Browser es blockieren.
    const target = window.open("", "_blank");
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/admin/vorlagen/${props.id}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(designer.current.getTemplate()),
      });
      if (!response.ok) {
        target?.close();
        setStatus({ tone: "error", text: (await response.text()) || "Vorschau fehlgeschlagen." });
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      if (target) target.location.href = url;
      else window.location.href = url;
    } catch {
      target?.close();
      setStatus({ tone: "error", text: "Keine Verbindung zum Server." });
    } finally {
      setBusy(false);
    }
  }

  async function importPdf(file: File | undefined) {
    if (!file || !designer.current) return;
    try {
      const basePdf = await readAsDataUrl(file);
      designer.current.updateTemplate({ ...designer.current.getTemplate(), basePdf });
      setDirty(true);
      setStatus({ tone: "info", text: `„${file.name}“ ist jetzt der Hintergrund.` });
    } catch {
      setStatus({ tone: "error", text: "Die Datei konnte nicht gelesen werden." });
    }
  }

  const button =
    "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-primary/10 disabled:opacity-50";
  const input =
    "rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Bewusst ein normaler Link: Nur so greift die Warnung bei ungespeicherten Änderungen. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/admin/vorlagen" className="text-sm text-primary-strong underline underline-offset-2">
            ← Vorlagen
          </a>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Name der Vorlage</span>
            <input
              className={`${input} w-64`}
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => {
                setName(event.target.value);
                setDirty(true);
              }}
            />
          </label>
          <button
            type="button"
            className="rounded-md bg-primary-strong px-3 py-1.5 text-sm font-medium text-white hover:brightness-95 disabled:opacity-50"
            disabled={!ready || busy}
            onClick={save}
          >
            Speichern
          </button>
          <button type="button" className={button} disabled={!ready || busy} onClick={preview}>
            Vorschau als PDF
          </button>
          <label className={`${button} cursor-pointer`}>
            PDF als Hintergrund
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              disabled={!ready}
              onChange={(event) => {
                void importPdf(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <span
            role="status"
            className={`text-sm ${status?.tone === "error" ? "text-red-700" : "text-muted"}`}
          >
            {status?.text ??
              (!ready ? "Editor wird geladen …" : dirty ? "Ungespeicherte Änderungen" : "")}
          </span>
          <form
            method="post"
            action={`/admin/vorlagen/${props.id}/delete`}
            className="ml-auto"
            onSubmit={(event) => {
              if (!window.confirm(`Vorlage „${name}“ endgültig löschen?`)) event.preventDefault();
              else setDirty(false);
            }}
          >
            <button type="submit" className="text-sm text-red-700 underline underline-offset-2">
              Löschen
            </button>
          </form>
        </div>

        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted">Beschreibung und Platzhalter</summary>
          <div className="grid gap-6 py-3 md:grid-cols-2">
            <label className="block">
              <span className="font-medium">Beschreibung des Leistungsnachweises</span>
              <textarea
                className={`${input} mt-1.5 block h-32 w-full`}
                value={description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setDirty(true);
                }}
              />
              <span className="mt-1.5 block text-muted">
                Erscheint später auf der öffentlichen Zertifikatsseite, nicht im PDF.
              </span>
            </label>
            <div>
              <p className="font-medium">Platzhalter</p>
              <p className="mt-1.5 text-muted">
                In einem Feld „Text mit Platzhaltern“ werden sie beim Ausstellen ersetzt.
              </p>
              <dl className="mt-2 space-y-1">
                {PLACEHOLDERS.map((placeholder) => (
                  <div key={placeholder.key} className="flex gap-3">
                    <dt className="w-24 font-mono">{`{${placeholder.key}}`}</dt>
                    <dd className="text-muted">{placeholder.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </details>
      </header>
      <div ref={container} className="min-h-0 flex-1" />
    </div>
  );
}
