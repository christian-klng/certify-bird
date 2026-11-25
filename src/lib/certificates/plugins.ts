import {
  ellipse,
  image,
  line,
  multiVariableText,
  rectangle,
  svg,
  text,
} from "@pdfme/schemas";

/**
 * Bausteine, die in Zertifikatsvorlagen erlaubt sind. Editor und
 * PDF-Erzeugung müssen dieselbe Liste benutzen, sonst zeigt der Editor
 * Elemente an, die im PDF fehlen.
 */
export const certificatePlugins = {
  Text: text,
  "Text mit Platzhaltern": multiVariableText,
  Bild: image,
  SVG: svg,
  Linie: line,
  Rechteck: rectangle,
  Ellipse: ellipse,
};
