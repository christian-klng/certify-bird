import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Heading, TextLink, WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { listTemplates } from "@/lib/certificates/templates";
import { listQuizzes, quizContent } from "@/lib/quizzes/store";
import { IssueForm } from "../issue-form";

export const metadata = { title: "Zertifikate ausstellen – Certify Bird", robots: "noindex" };

export default function NewIssuancePage() {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <NewIssuance />
      </Suspense>
    </WidePage>
  );
}

async function NewIssuance() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const [templates, quizzes] = await Promise.all([
    listTemplates(member.organization.id),
    listQuizzes(member.organization.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <p className="text-sm">
        <TextLink href="/admin/zertifikate">← Zertifikate</TextLink>
      </p>
      <Heading title="Zertifikate ausstellen" />
      {templates.length === 0 ? (
        <p className="mt-6 text-sm">
          Dafür brauchst du zuerst eine Vorlage.{" "}
          <TextLink href="/admin/vorlagen">Vorlage anlegen</TextLink>
        </p>
      ) : (
        <IssueForm
          action="/admin/zertifikate/create"
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
          quizzes={quizzes
            .filter((quiz) => quizContent(quiz).questions.length > 0)
            .map((quiz) => ({ id: quiz.id, name: quiz.name }))}
          today={today}
        />
      )}
    </>
  );
}
