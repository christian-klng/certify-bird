import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { listIssuances } from "@/lib/certificates/issuances";

export const metadata = { title: "Kohorten – Certify Bird", robots: "noindex" };

export default function CertificatesPage(props: PageProps<"/admin/zertifikate">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <Issuances searchParams={props.searchParams} />
      </Suspense>
    </WidePage>
  );
}

async function Issuances(props: { searchParams: PageProps<"/admin/zertifikate">["searchParams"] }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const query = await props.searchParams;
  const issuances = await listIssuances(member.organization.id);

  return (
    <>
      <p className="text-sm">
        <TextLink href="/admin">← Verwaltung</TextLink>
      </p>
      <Heading
        title="Kohorten"
        text="Eine Kohorte ist ein Durchgang eines Kurses mit einer Vorlage. Darunter findest du die Teilnehmenden und ihre Zertifikate."
      />
      {"deleted" in query && <Notice>Die Kohorte wurde gelöscht.</Notice>}

      <p className="mt-6">
        <Link
          href="/admin/zertifikate/neu"
          className="inline-flex rounded-md bg-primary-strong px-4 py-2 text-base font-medium text-white hover:brightness-95"
        >
          Kohorte anlegen
        </Link>
      </p>

      {issuances.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Es gibt noch keine Kohorte.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {issuances.map((issuance) => (
            <li key={issuance.id} className="flex items-baseline justify-between gap-4 py-3">
              <TextLink href={`/admin/zertifikate/${issuance.id}`}>{issuance.courseTitle}</TextLink>
              <span className="shrink-0 text-sm text-muted">
                {issuance.template ? `Vorlage „${issuance.template.name}“ · ` : ""}
                {issuance._count.certificates}{" "}
                {issuance._count.certificates === 1 ? "Zertifikat" : "Zertifikate"}
                {issuance._count.candidates > 0 &&
                  ` · ${issuance._count.candidates} ${issuance.quiz === null ? "ohne Zertifikat" : "im Quiz"}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
