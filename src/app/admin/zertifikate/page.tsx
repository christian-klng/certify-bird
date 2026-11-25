import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { listIssuances } from "@/lib/certificates/issuances";
import { formatIssueDate } from "@/lib/certificates/recipients";

export const metadata = { title: "Zertifikate – Certify Bird", robots: "noindex" };

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
        title="Zertifikate"
        text="Jede Ausstellung gilt für eine Weiterbildung an einem Datum und enthält ein Zertifikat pro Person."
      />
      {"deleted" in query && <Notice>Die Ausstellung wurde gelöscht.</Notice>}

      <p className="mt-6">
        <Link
          href="/admin/zertifikate/neu"
          className="inline-flex rounded-md bg-primary-strong px-4 py-2 text-base font-medium text-white hover:brightness-95"
        >
          Zertifikate ausstellen
        </Link>
      </p>

      {issuances.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Es wurden noch keine Zertifikate ausgestellt.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {issuances.map((issuance) => (
            <li key={issuance.id} className="flex items-baseline justify-between gap-4 py-3">
              <TextLink href={`/admin/zertifikate/${issuance.id}`}>{issuance.courseTitle}</TextLink>
              <span className="shrink-0 text-sm text-muted">
                {formatIssueDate(issuance.issuedOn)} · {issuance._count.certificates}{" "}
                {issuance._count.certificates === 1 ? "Zertifikat" : "Zertifikate"}
                {issuance._count.candidates > 0 && ` · ${issuance._count.candidates} im Quiz`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
