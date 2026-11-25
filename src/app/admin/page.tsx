import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Heading, Page, TextLink } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";

export const metadata = { title: "Verwaltung – Certify Bird", robots: "noindex" };

export default function AdminPage() {
  return (
    <Page>
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    </Page>
  );
}

async function Admin() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  return (
    <>
      <Heading
        eyebrow="Verwaltung"
        title={member.organization.name}
        text="Hier entstehen als Nächstes Teilnehmende und Zertifikate."
      />
      <p className="mt-6">
        <TextLink href="/admin/vorlagen">Vorlagen</TextLink>
      </p>
      <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Angemeldet als</dt>
          <dd>{member.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Rolle</dt>
          <dd>{member.role === "OWNER" ? "Inhaber" : "Mitglied"}</dd>
        </div>
      </dl>
      <form method="post" action="/logout">
        <button
          type="submit"
          className="mt-6 text-sm text-primary-strong underline underline-offset-2 hover:no-underline"
        >
          Abmelden
        </button>
      </form>
    </>
  );
}
