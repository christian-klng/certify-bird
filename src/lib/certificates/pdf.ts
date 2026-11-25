import { generate } from "@pdfme/generator";
import { buildInputs, type Design, type PlaceholderValues } from "./design";
import { certificatePlugins } from "./plugins";

/** Erzeugt aus einer geprüften Gestaltung und den Werten ein PDF. */
export function renderPdf(design: Design, values: PlaceholderValues): Promise<Uint8Array<ArrayBuffer>> {
  return renderPdfs(design, [values]);
}

/** Erzeugt ein PDF mit einem Zertifikat pro Person, hintereinander (zum Drucken). */
export async function renderPdfs(
  design: Design,
  people: PlaceholderValues[],
): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = await generate({
    template: design,
    inputs: people.flatMap((values) => buildInputs(design, values)),
    plugins: certificatePlugins,
  });
  return new Uint8Array(pdf);
}

/** Antwort mit einem PDF, das der Browser anzeigt. */
export function pdfResponse(pdf: Uint8Array<ArrayBuffer>, filename: string): Response {
  // Dateiname ohne Zeichen, die den Header brechen; der volle Name steht UTF-8-kodiert daneben.
  const ascii = filename.replace(/[^A-Za-z0-9._ -]/g, "_");
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
