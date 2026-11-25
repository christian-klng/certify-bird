import { Suspense } from "react";
import { Button, Heading, Notice, Page, TextLink } from "@/components/ui";
import { peekLoginToken } from "@/lib/auth/login";

export const metadata = { title: "Anmeldung bestätigen – Certify Bird", robots: "noindex" };

export default function VerifyPage(props: PageProps<"/login/verify">) {
  return (
    <Page>
      <Suspense fallback={null}>
        <Verify searchParams={props.searchParams} />
      </Suspense>
    </Page>
  );
}

async function Verify(props: { searchParams: PageProps<"/login/verify">["searchParams"] }) {
  const params = await props.searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const found = token ? await peekLoginToken(token) : null;

  if (params.error === "slug-taken") {
    return (
      <>
        <Heading
          title="Kürzel inzwischen vergeben"
          text="Jemand anderes hat dieses Kürzel in der Zwischenzeit registriert."
        />
        <p className="mt-5 text-sm">
          <TextLink href="/register">Mit anderem Kürzel registrieren</TextLink>
        </p>
      </>
    );
  }

  if (!found) {
    return (
      <>
        <Heading
          title="Link ungültig oder abgelaufen"
          text="Jeder Anmeldelink gilt nur einmal und nur für begrenzte Zeit."
        />
        <p className="mt-5 text-sm">
          <TextLink href="/login">Neuen Link anfordern</TextLink>
        </p>
      </>
    );
  }

  const registering = found.purpose === "REGISTER";
  return (
    <>
      <Heading
        title={registering ? "Registrierung abschließen" : "Anmeldung bestätigen"}
        text={
          registering
            ? "Mit einem Klick wird dein Bildungsanbieter angelegt."
            : "Mit einem Klick bist du angemeldet."
        }
      />
      {/* Erst der Klick löst den Link ein. So verbrauchen ihn Mail-Scanner nicht, die Links vorab öffnen. */}
      <form method="post" action="/login/confirm">
        <input type="hidden" name="token" value={token} />
        <Button type="submit">{registering ? "Anbieter anlegen" : "Jetzt anmelden"}</Button>
      </form>
      {registering && <Notice>Danach meldest du dich direkt bei deinem neuen Anbieter an.</Notice>}
    </>
  );
}
