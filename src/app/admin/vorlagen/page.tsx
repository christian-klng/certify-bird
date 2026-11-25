import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button, Field, Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { listTemplates } from "@/lib/certificates/templates";

export const metadata = { title: "Vorlagen – Certify Bird", robots: "noindex" };

export default function TemplatesPage(props: PageProps<"/admin/vorlagen">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <Templates searchParams={props.searchParams} />
      </Suspense>
    </WidePage>
  );
}

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

async function Templates(props: { searchParams: PageProps<"/admin/vorlagen">["searchParams"] }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const query = await props.searchParams;
  const templates = await listTemplates(member.organization.id);

  return (
    <>
      <p className="text-sm">
        <TextLink href="/admin">← Verwaltung</TextLink>
      </p>
      <Heading
        title="Vorlagen"
        text="Eine Vorlage legt fest, wie ein Zertifikat aussieht und was es bescheinigt."
      />
      {"deleted" in query && <Notice>Die Vorlage wurde gelöscht.</Notice>}

      {templates.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Es gibt noch keine Vorlage.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {templates.map((template) => (
            <li key={template.id} className="flex items-baseline justify-between gap-4 py-3">
              <TextLink href={`/admin/vorlagen/${template.id}`}>{template.name}</TextLink>
              <span className="text-sm text-muted">
                geändert {dateFormat.format(template.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form method="post" action="/admin/vorlagen/create" className="mt-8 max-w-md">
        <h2 className="text-base font-semibold">Neue Vorlage</h2>
        {"error" in query && (
          <Notice tone="error">Bitte gib einen Namen mit höchstens 120 Zeichen ein.</Notice>
        )}
        <Field
          label="Name"
          name="name"
          required
          maxLength={120}
          hint="Nur für dich, zum Beispiel der Titel der Weiterbildung."
        />
        <Button type="submit">Vorlage anlegen</Button>
      </form>
    </>
  );
}
