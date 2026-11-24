import { Suspense } from "react";
import { Button, Field, Heading, Notice, Page, TextLink } from "@/components/ui";
import { getCurrentTenant } from "@/lib/current-tenant";

export const metadata = { title: "Anmelden – Certify Bird" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Page>
      <Suspense fallback={null}>
        <Login searchParams={props.searchParams} />
      </Suspense>
    </Page>
  );
}

async function Login(props: { searchParams: PageProps<"/login">["searchParams"] }) {
  const [tenant, params] = await Promise.all([getCurrentTenant(), props.searchParams]);

  if (tenant.kind === "platform") {
    return (
      <>
        <Heading
          eyebrow="Certify Bird"
          title="Anmelden"
          text="Die Anmeldung findest du unter der Adresse deines Bildungsanbieters."
        />
        <p className="mt-5 text-sm text-muted">
          Noch nicht dabei? <TextLink href="/register">Anbieter registrieren</TextLink>
        </p>
      </>
    );
  }

  if (tenant.kind !== "tenant") {
    return (
      <Heading
        title="Anmeldung noch nicht möglich"
        text="Auf dieser Instanz wurde noch kein Bildungsanbieter eingerichtet."
      />
    );
  }

  return (
    <>
      <Heading
        eyebrow={tenant.organization.name}
        title="Anmelden"
        text="Gib deine E-Mail-Adresse ein. Du bekommst einen Link, mit dem du dich ohne Passwort anmeldest."
      />
      {params.sent !== undefined && (
        <Notice>
          Wenn diese Adresse bei uns hinterlegt ist, ist eine E-Mail mit dem
          Anmeldelink unterwegs. Der Link gilt 15 Minuten.
        </Notice>
      )}
      {params.error === "email" && (
        <Notice tone="error">Bitte gib eine gültige E-Mail-Adresse ein.</Notice>
      )}
      {params.error === "mail" && (
        <Notice tone="error">
          Die E-Mail konnte gerade nicht verschickt werden. Bitte versuche es später noch einmal.
        </Notice>
      )}
      <form method="post" action="/login/request">
        <Field label="E-Mail-Adresse" name="email" type="email" autoComplete="email" required autoFocus />
        <Button type="submit">Anmeldelink schicken</Button>
      </form>
    </>
  );
}
