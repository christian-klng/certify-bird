"use client";

/** Absende-Knopf für ein Löschformular, der vorher nachfragt. */
export function ConfirmButton(props: { question: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="text-sm text-red-700 underline underline-offset-2 hover:no-underline"
      onClick={(event) => {
        if (!window.confirm(props.question)) event.preventDefault();
      }}
    >
      {props.children}
    </button>
  );
}
