import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentMember } from "@/lib/auth/request";
import type { Design } from "@/lib/certificates/design";
import { findTemplate } from "@/lib/certificates/templates";
import { TemplateEditor } from "./editor";

export const metadata = { title: "Vorlage bearbeiten – Certify Bird", robots: "noindex" };

export default function TemplatePage(props: PageProps<"/admin/vorlagen/[id]">) {
  return (
    <Suspense fallback={null}>
      <Template params={props.params} />
    </Suspense>
  );
}

async function Template(props: { params: PageProps<"/admin/vorlagen/[id]">["params"] }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const { id } = await props.params;
  const template = await findTemplate(member.organization.id, id);
  if (!template) notFound();

  return (
    <TemplateEditor
      id={template.id}
      name={template.name}
      description={template.description}
      design={template.design as unknown as Design}
    />
  );
}
