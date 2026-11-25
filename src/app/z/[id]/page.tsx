import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TextLink, WidePage } from "@/components/ui";
import { findPublishedCertificate } from "@/lib/certificates/public";
import { formatIssueDate } from "@/lib/certificates/recipients";
import { getCurrentTenant } from "@/lib/current-tenant";

async function load(params: PageProps<"/z/[id]">["params"]) {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "tenant") return null;
  return findPublishedCertificate(tenant.organization.id, (await params).id);
}

export async function generateMetadata(props: PageProps<"/z/[id]">): Promise<Metadata> {
  const certificate = await load(props.params);
  if (!certificate) return { title: "Zertifikat", robots: "noindex" };
  const title = `${certificate.recipientName} – ${certificate.issuance.courseTitle}`;
  const description = `Zertifikat von ${certificate.issuance.issuerName}, ausgestellt am ${formatIssueDate(certificate.issuance.issuedOn)}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    // Teilen ja, Auffinden über Suchmaschinen nein: Die Einwilligung gilt für
    // Personen, die die Adresse kennen.
    robots: "noindex",
  };
}

export default function PublicCertificatePage(props: PageProps<"/z/[id]">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <PublicCertificate params={props.params} />
      </Suspense>
    </WidePage>
  );
}

async function PublicCertificate(props: { params: PageProps<"/z/[id]">["params"] }) {
  // Der Proxy hat schon mit 404 geantwortet, wenn es nichts Öffentliches gibt.
  // Diese Prüfung bleibt, falls die Einwilligung dazwischen widerrufen wurde.
  const certificate = await load(props.params);
  if (!certificate) notFound();
  const { issuance } = certificate;

  return (
    <article>
      <p className="text-sm font-medium text-primary-strong">{issuance.issuerName}</p>
      <p className="mt-6 text-sm text-muted">Zertifikat für</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{certificate.recipientName}</h1>
      <p className="mt-6 text-sm text-muted">Weiterbildung</p>
      <p className="mt-1 text-xl font-medium">{issuance.courseTitle}</p>
      <p className="mt-6 text-sm text-muted">Ausgestellt am</p>
      <p className="mt-1">{formatIssueDate(issuance.issuedOn)}</p>

      {issuance.description && (
        <>
          <h2 className="mt-8 text-sm text-muted">Was das Zertifikat bescheinigt</h2>
          <p className="mt-1 whitespace-pre-line">{issuance.description}</p>
        </>
      )}

      <p className="mt-8">
        <TextLink href={`/z/${certificate.id}/pdf`} target="_blank">
          Zertifikat als PDF
        </TextLink>
      </p>
      <p className="mt-10 border-t border-border pt-5 text-sm text-muted">
        Diese Seite wird von {issuance.issuerName} bereitgestellt und bestätigt, dass das
        Zertifikat echt ist.
      </p>
    </article>
  );
}
