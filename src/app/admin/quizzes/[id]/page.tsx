import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { findQuiz, quizContent } from "@/lib/quizzes/store";
import { QuizEditor } from "./editor";

export const metadata = { title: "Quiz bearbeiten – Certify Bird", robots: "noindex" };

export default function QuizPage(props: PageProps<"/admin/quizzes/[id]">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <Quiz params={props.params} />
      </Suspense>
    </WidePage>
  );
}

async function Quiz(props: { params: PageProps<"/admin/quizzes/[id]">["params"] }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const { id } = await props.params;
  const quiz = await findQuiz(member.organization.id, id);
  if (!quiz) notFound();

  return <QuizEditor id={quiz.id} name={quiz.name} content={quizContent(quiz)} />;
}
