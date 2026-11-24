import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentTenant } from "@/lib/current-tenant";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <Suspense fallback={null}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const tenant = await getCurrentTenant();

  // Unbekannte Hosts fängt bereits src/proxy.ts mit einem echten 404 ab.
  if (tenant.kind === "not-found") notFound();

  if (tenant.kind === "platform") {
    return (
      <Intro
        eyebrow="Certify Bird"
        title="Zertifikate für Bildungsanbieter"
        text="Vorlagen gestalten, Teilnahmezertifikate ausstellen und als Open Badge bereitstellen."
      />
    );
  }

  if (tenant.kind === "setup") {
    return (
      <Intro
        eyebrow="Einrichtung"
        title="Noch kein Bildungsanbieter angelegt"
        text="Setze ORG_NAME und führe „pnpm db:seed“ aus, um den Anbieter dieser Instanz anzulegen."
      />
    );
  }

  return (
    <Intro
      eyebrow="Zertifikate"
      title={tenant.organization.name}
      text="Hier erscheinen künftig die Zertifikate dieses Bildungsanbieters."
    />
  );
}

function Intro(props: { eyebrow: string; title: string; text: string }) {
  return (
    <>
      <p className="text-sm font-medium text-primary-strong">{props.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {props.title}
      </h1>
      <p className="mt-4 text-base text-muted">{props.text}</p>
    </>
  );
}
