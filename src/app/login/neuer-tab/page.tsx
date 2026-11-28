import { Suspense } from "react";
import { Heading, Notice, Page } from "@/components/ui";
import { getRequestContext } from "@/lib/auth/request";

export const metadata = { title: "Angemeldet – Certify Bird", robots: "noindex" };

/**
 * Ziel nach einer Anmeldung in einem abgeschirmten Fenster (Link aus einem
 * Webmailer geöffnet). Dort ist man zwar angemeldet, der Browser schickt die
 * Sitzung aber bei Formularen nicht mit. Ein Link hilft nicht, weil auch ein
 * daraus geöffneter Tab abgeschirmt wäre: Die Adresse muss von Hand in einen
 * neuen Tab.
 */
export default function NewTabPage(props: PageProps<"/login/neuer-tab">) {
  return (
    <Page>
      <Suspense fallback={null}>
        <NewTab searchParams={props.searchParams} />
      </Suspense>
    </Page>
  );
}

async function NewTab(props: { searchParams: PageProps<"/login/neuer-tab">["searchParams"] }) {
  const [{ origin }, params] = await Promise.all([getRequestContext(), props.searchParams]);
  const path = params.ziel === "verwaltung" ? "/admin" : "/meine-zertifikate";
  const address = origin ? `${origin.replace(/^https?:\/\//, "")}${path}` : path;

  return (
    <>
      <Heading
        title="Du bist angemeldet"
        text="Ein Schritt fehlt noch: Dieses Fenster wurde aus deinem Mail-Postfach heraus geöffnet und ist deshalb eingeschränkt. Formulare funktionieren hier nicht."
      />
      <Notice>
        Öffne einen neuen Tab und gib dort diese Adresse ein. Du bleibst angemeldet.
      </Notice>
      <p className="mt-5 select-all break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-sm">
        {address}
      </p>
      <p className="mt-3 text-sm text-muted">
        Bitte kopieren oder abtippen, nicht aus diesem Fenster heraus öffnen.
      </p>
    </>
  );
}
