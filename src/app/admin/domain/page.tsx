import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button, Field, Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { readConfig } from "@/lib/config";
import { cnameTarget } from "@/lib/custom-domain";

export const metadata = { title: "Eigene Domain – Certify Bird", robots: "noindex" };

export default function DomainPage(props: PageProps<"/admin/domain">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <Domain searchParams={props.searchParams} />
      </Suspense>
    </WidePage>
  );
}

function Code(props: { children: React.ReactNode }) {
  return <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-sm">{props.children}</code>;
}

async function Domain(props: { searchParams: PageProps<"/admin/domain">["searchParams"] }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const query = await props.searchParams;
  const config = readConfig();
  const { organization } = member;
  const back = (
    <p className="text-sm">
      <TextLink href="/admin">← Verwaltung</TextLink>
    </p>
  );

  if (config.mode !== "saas" || !config.baseDomain) {
    return (
      <>
        {back}
        <Heading
          title="Eigene Domain"
          text="Diese Instanz läuft für einen einzelnen Anbieter. Ihre Adresse legt fest, wer sie betreibt."
        />
      </>
    );
  }
  if (member.role !== "OWNER") {
    return (
      <>
        {back}
        <Heading title="Eigene Domain" text="Die Adresse kann nur der Inhaber ändern." />
      </>
    );
  }

  const target = cnameTarget(organization.slug, config.baseDomain);
  const domain = organization.customDomain;
  const active = Boolean(domain && organization.customDomainVerifiedAt);

  return (
    <>
      {back}
      <Heading
        title="Eigene Domain"
        text="Zertifikate, Anmeldung und Open Badges können unter einer Subdomain deiner eigenen Domain laufen."
      />
      {"removed" in query && <Notice>Die eigene Domain wurde entfernt.</Notice>}
      {query.error === "invalid" && (
        <Notice tone="error">
          Bitte gib eine Subdomain an, zum Beispiel zertifikate.meine-akademie.de. Eine Hauptdomain
          ohne Subdomain geht nicht.
        </Notice>
      )}
      {query.error === "taken" && (
        <Notice tone="error">Diese Domain nutzt bereits ein anderer Anbieter.</Notice>
      )}
      {query.check === "dns" && (
        <Notice tone="error">
          Der DNS-Eintrag stimmt noch nicht.{" "}
          {typeof query.found === "string"
            ? `Der CNAME zeigt auf ${query.found} statt auf ${target}.`
            : `Für ${domain} ist kein CNAME auf ${target} zu finden.`}{" "}
          Nach einer Änderung kann es bis zu einigen Stunden dauern, bis sie überall ankommt.
        </Notice>
      )}
      {query.check === "https" && (
        <Notice tone="error">
          Der DNS-Eintrag stimmt, aber unter https://{domain} antwortet Certify Bird noch nicht
          mit einem gültigen Zertifikat. Das Zertifikat wird beim ersten Aufruf ausgestellt;
          versuch es in ein paar Minuten noch einmal. Bis dahin bleibt alles, wie es ist.
        </Notice>
      )}

      <dl className="mt-6 space-y-2 border-y border-border py-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Adresse bei Certify Bird</dt>
          <dd>{target}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Eigene Domain</dt>
          <dd>{domain ? `${domain} (${active ? "aktiv" : "noch nicht geprüft"})` : "keine"}</dd>
        </div>
      </dl>

      {domain && !active && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">So schaltest du {domain} frei</h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm">
            <li>
              Leg bei deinem Domain-Anbieter einen DNS-Eintrag vom Typ <Code>CNAME</Code> an: Name{" "}
              <Code>{domain}</Code>, Ziel <Code>{target}</Code>.
            </li>
            <li>
              Klick auf „Jetzt prüfen“. Certify Bird prüft den Eintrag und ob die Seite unter
              deiner Domain verschlüsselt erreichbar ist.
            </li>
            <li>
              Gelingt die Prüfung, gilt sofort nur noch deine Domain. Die bisherige Adresse leitet
              dorthin um, und du meldest dich unter der neuen Adresse einmal neu an.
            </li>
          </ol>
          <form method="post" action="/admin/domain/verify">
            <Button type="submit">Jetzt prüfen</Button>
          </form>
        </section>
      )}

      {active && (
        <Notice>
          Dein Anbieter ist unter {domain} erreichbar. Lass den CNAME bestehen: Ohne ihn
          funktionieren weder die Seiten noch die Prüfung bereits ausgestellter Open Badges.
        </Notice>
      )}

      {!active && (
        <form method="post" action="/admin/domain/set" className="mt-8 max-w-md">
          <h2 className="text-base font-semibold">
            {domain ? "Andere Domain verwenden" : "Domain eintragen"}
          </h2>
          <Field
            label="Subdomain"
            name="domain"
            required
            placeholder="zertifikate.meine-akademie.de"
            hint="Eingetragen ist noch nichts umgestellt. Erst die Prüfung schaltet die Domain frei."
          />
          <Button type="submit">Vormerken</Button>
        </form>
      )}

      {domain && (
        <form method="post" action="/admin/domain/remove" className="mt-10 border-t border-border pt-5">
          <p className="text-sm text-muted">
            {active
              ? `Ohne eigene Domain gilt wieder ${target}. Open Badges, die unter ${domain} ausgestellt wurden, lassen sich dann nicht mehr prüfen.`
              : "Die vorgemerkte Domain wird verworfen."}
          </p>
          <button
            type="submit"
            className="mt-2 text-sm text-red-700 underline underline-offset-2 hover:no-underline"
          >
            Eigene Domain entfernen
          </button>
        </form>
      )}
    </>
  );
}
