import { generate } from "@pdfme/generator";
import { buildInputs, type Design, type PlaceholderValues } from "./design";
import { certificatePlugins } from "./plugins";

/** Erzeugt aus einer geprüften Gestaltung und den Werten ein PDF. */
export async function renderPdf(design: Design, values: PlaceholderValues): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = await generate({
    template: design,
    inputs: buildInputs(design, values),
    plugins: certificatePlugins,
  });
  return new Uint8Array(pdf);
}
