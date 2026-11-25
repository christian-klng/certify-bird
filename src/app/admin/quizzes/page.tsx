import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button, Field, Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { listQuizzes, quizContent } from "@/lib/quizzes/store";

export const metadata = { title: "Quizzes – Certify Bird", robots: "noindex" };

export default function QuizzesPage(props: PageProps<"/admin/quizzes">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <Quizzes searchParams={props.searchParams} />
      </Suspense>
    </WidePage>
  );
}

async function Quizzes(props: { searchParams: PageProps<"/admin/quizzes">["searchParams"] }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const query = await props.searchParams;
  const quizzes = await listQuizzes(member.organization.id);

  return (
    <>
      <p className="text-sm">
        <TextLink href="/admin">← Verwaltung</TextLink>
      </p>
      <Heading
        title="Quizzes"
        text="Ein Quiz fragt ab, was Teilnehmende gelernt haben. Beim Ausstellen kannst du festlegen, dass es ein Zertifikat erst nach bestandenem Quiz gibt."
      />
      {"deleted" in query && <Notice>Das Quiz wurde gelöscht.</Notice>}

      {quizzes.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Es gibt noch kein Quiz.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {quizzes.map((quiz) => {
            const count = quizContent(quiz).questions.length;
            return (
              <li key={quiz.id} className="flex items-baseline justify-between gap-4 py-3">
                <TextLink href={`/admin/quizzes/${quiz.id}`}>{quiz.name}</TextLink>
                <span className="shrink-0 text-sm text-muted">
                  {count === 0 ? "noch ohne Fragen" : `${count} ${count === 1 ? "Frage" : "Fragen"}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <form method="post" action="/admin/quizzes/create" className="mt-8 max-w-md">
        <h2 className="text-base font-semibold">Neues Quiz</h2>
        {"error" in query && (
          <Notice tone="error">Bitte gib einen Namen mit höchstens 120 Zeichen ein.</Notice>
        )}
        <Field
          label="Name"
          name="name"
          required
          maxLength={120}
          hint="Teilnehmende sehen ihn nicht; ihnen wird der Titel der Weiterbildung angezeigt."
        />
        <Button type="submit">Quiz anlegen</Button>
      </form>
    </>
  );
}
