import { Suspense } from "react";
import { Button, Field, Heading, Notice, Page } from "@/components/ui";
import { readConfig } from "@/lib/config";

export const metadata = { title: "Anbieter registrieren – Certify Bird" };

const ERRORS: Record<string, string> = {
  email: "Bitte gib eine gültige E-Mail-Adresse ein.",
  name: "Bitte gib den Namen deines Bildungsanbieters ein (2 bis 120 Zeichen).",
  "slug-invalid":
    "Das Kürzel darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten, muss 3 bis 63 Zeichen lang sein und darf kein reservierter Name sein.",
  "slug-taken": "Dieses Kürzel ist bereits vergeben.",
  mail: "Die E-Mail konnte gerade nicht verschickt werden. Bitte versuche es später noch einmal.",
};

// Nur im SaaS-Modus auf der Plattform-Adresse erreichbar; das stellt src/proxy.ts sicher.
export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <Page>
      <Heading
        eyebrow="Certify Bird"
        title="Anbieter registrieren"
        text="Du bekommst einen Link per E-Mail, mit dem du die Registrierung abschließt. Ein Passwort brauchst du nicht."
      />
      <Suspense fallback={null}>
        <RegisterForm searchParams={props.searchParams} />
      </Suspense>
    </Page>
  );
}

async function RegisterForm(props: { searchParams: PageProps<"/register">["searchParams"] }) {
  const params = await props.searchParams;
  const baseDomain = readConfig().baseDomain;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  if (params.sent !== undefined) {
    return (
      <Notice>
        Fast geschafft: Wir haben dir eine E-Mail mit dem Bestätigungslink geschickt.
        Der Link gilt 15 Minuten.
      </Notice>
    );
  }

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      <form method="post" action="/register/request">
        <Field label="Name des Bildungsanbieters" name="name" required maxLength={120} autoFocus />
        <Field
          label="Kürzel"
          name="slug"
          required
          minLength={3}
          maxLength={63}
          pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
          autoCapitalize="none"
          spellCheck={false}
          hint={`Deine Adresse wird <kürzel>.${baseDomain}. Das Kürzel lässt sich später ändern, die alte Adresse bleibt dann erreichbar.`}
        />
        <Field label="E-Mail-Adresse" name="email" type="email" autoComplete="email" required />
        <Button type="submit">Registrieren</Button>
      </form>
    </>
  );
}
