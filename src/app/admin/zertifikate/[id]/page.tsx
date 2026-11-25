import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { findIssuance } from "@/lib/certificates/issuances";
import { formatIssueDate } from "@/lib/certificates/recipients";
import { ConfirmButton } from "../confirm-button";
import { IssueForm } from "../issue-form";

export const metadata = { title: "Ausstellung – Certify Bird", robots: "noindex" };

export default function IssuancePage(props: PageProps<"/admin/zertifikate/[id]">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <Issuance params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </WidePage>
  );
}

async function Issuance(props: {
  params: PageProps<"/admin/zertifikate/[id]">["params"];
  searchParams: PageProps<"/admin/zertifikate/[id]">["searchParams"];
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const { id } = await props.params;
  const query = await props.searchParams;
  const issuance = await findIssuance(member.organization.id, id);
  if (!issuance) notFound();
  const base = `/admin/zertifikate/${issuance.id}`;
  const count = issuance.certificates.length;

  return (
    <>
      <p className="text-sm">
        <TextLink href="/admin/zertifikate">← Zertifikate</TextLink>
      </p>
      <Heading
        title={issuance.courseTitle}
        text={`Ausgestellt am ${formatIssueDate(issuance.issuedOn)} von ${issuance.issuerName}${
          issuance.template ? `, Vorlage „${issuance.template.name}“` : ""
        }.`}
      />
      {"issued" in query && (
        <Notice>
          Die Zertifikate sind ausgestellt. Die Teilnehmenden wurden noch nicht benachrichtigt.
        </Notice>
      )}
      {"removed" in query && <Notice>Das Zertifikat wurde gelöscht.</Notice>}

      {count > 0 && (
        <p className="mt-6 text-sm">
          <TextLink href={`${base}/pdf`} target="_blank">
            Alle {count} als ein PDF zum Drucken
          </TextLink>
        </p>
      )}
      {count === 0 ? (
        <p className="mt-6 text-sm text-muted">Diese Ausstellung enthält keine Zertifikate mehr.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {issuance.certificates.map((certificate) => (
            <li key={certificate.id} className="flex items-baseline gap-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{certificate.recipientName}</span>
                <span className="block truncate text-sm text-muted">{certificate.recipientEmail}</span>
              </span>
              <TextLink href={`${base}/${certificate.id}/pdf`} target="_blank">
                PDF
              </TextLink>
              <form method="post" action={`${base}/${certificate.id}/delete`}>
                <ConfirmButton
                  question={`Zertifikat für ${certificate.recipientName} endgültig löschen?`}
                >
                  Löschen
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-base font-semibold">Weitere Teilnehmende hinzufügen</h2>
      <IssueForm action={`${base}/add`} />

      <form method="post" action={`${base}/delete`} className="mt-10 border-t border-border pt-5">
        <ConfirmButton
          question={`Die ganze Ausstellung „${issuance.courseTitle}“ mit ${count} Zertifikaten endgültig löschen?`}
        >
          Ganze Ausstellung löschen
        </ConfirmButton>
      </form>
    </>
  );
}
