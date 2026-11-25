import type { ComponentProps, ReactNode } from "react";

/** Schmale, zentrierte Seite für Formulare und kurze Hinweise. */
export function Page(props: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      {props.children}
    </main>
  );
}

/** Breitere, oben beginnende Seite für Listen in der Verwaltung. */
export function WidePage(props: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">{props.children}</main>;
}

export function Heading(props: { eyebrow?: string; title: string; text?: string }) {
  return (
    <>
      {props.eyebrow && (
        <p className="text-sm font-medium text-primary-strong">{props.eyebrow}</p>
      )}
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{props.title}</h1>
      {props.text && <p className="mt-3 text-base text-muted">{props.text}</p>}
    </>
  );
}

export function Field(
  props: { label: string; hint?: string } & ComponentProps<"input">,
) {
  const { label, hint, ...input } = props;
  return (
    <label className="mt-5 block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...input}
        className="mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      {hint && <span className="mt-1.5 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

export function Button(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="mt-6 inline-flex items-center justify-center rounded-md bg-primary-strong px-4 py-2 text-base font-medium text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary/50"
    />
  );
}

export function Notice(props: { tone?: "info" | "error"; children: ReactNode }) {
  const tone =
    props.tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-border bg-primary/10 text-foreground";
  return (
    <p role="status" className={`mt-5 rounded-md border px-3 py-2 text-sm ${tone}`}>
      {props.children}
    </p>
  );
}

export function TextLink(props: ComponentProps<"a">) {
  return (
    <a
      {...props}
      className="text-primary-strong underline underline-offset-2 hover:no-underline"
    />
  );
}
