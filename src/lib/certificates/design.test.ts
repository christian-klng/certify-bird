import { describe, expect, it } from "vitest";
import {
  buildInputs,
  checkDesign,
  normalizeName,
  sampleValues,
  starterDesign,
  usedPlaceholders,
  type Design,
} from "./design";
import { renderPdf } from "./pdf";

function withField(field: Record<string, unknown>): Design {
  return {
    ...starterDesign,
    schemas: [[...starterDesign.schemas[0], { position: { x: 0, y: 0 }, width: 10, height: 10, ...field }]],
  } as Design;
}

describe("checkDesign", () => {
  it("nimmt die Startvorlage an", () => {
    expect(checkDesign(structuredClone(starterDesign)).ok).toBe(true);
  });

  it("lehnt Unbrauchbares ab", () => {
    expect(checkDesign(null).ok).toBe(false);
    expect(checkDesign({ schemas: "x" }).ok).toBe(false);
  });

  it("lehnt eine Adresse als Hintergrund ab, nimmt ein eingebettetes PDF an", () => {
    expect(checkDesign({ ...starterDesign, basePdf: "https://example.org/a.pdf" }).ok).toBe(false);
    expect(checkDesign({ ...starterDesign, basePdf: "data:application/pdf;base64,AAAA" }).ok).toBe(true);
  });

  it("lehnt nicht freigegebene Feldtypen ab", () => {
    const result = checkDesign(withField({ name: "code", type: "qrcode", content: "x" }));
    expect(result).toEqual({ ok: false, error: "Der Feldtyp „qrcode“ ist nicht erlaubt." });
  });

  it("nennt unbekannte Platzhalter", () => {
    const result = checkDesign(
      withField({ name: "x", type: "multiVariableText", text: "{name} {note}", variables: ["name", "note"] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("{note}");
  });
});

describe("Platzhalter", () => {
  it("findet die Platzhalter der Startvorlage", () => {
    expect(usedPlaceholders(starterDesign).sort()).toEqual(["datum", "kurs", "name"]);
  });

  it("füllt Platzhaltertexte mit Werten und lässt festen Text stehen", () => {
    const [input] = buildInputs(starterDesign, sampleValues("Akademie Müller"));
    expect(input.titel).toBe("Teilnahmezertifikat");
    expect(JSON.parse(input.teilnehmer).name).toBe("Jörg Müßig-Çelik");
    expect(JSON.parse(input.bestaetigung).anbieter).toBe("Akademie Müller");
  });
});

describe("renderPdf", () => {
  it("erzeugt aus der Startvorlage ein PDF", async () => {
    const pdf = await renderPdf(starterDesign, sampleValues("Akademie Müller"));
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(pdf.byteLength).toBeGreaterThan(2000);
  });
});

describe("normalizeName", () => {
  it("räumt Leerraum auf und lehnt Leeres und zu Langes ab", () => {
    expect(normalizeName("  Kurs   A ")).toBe("Kurs A");
    expect(normalizeName("   ")).toBeNull();
    expect(normalizeName("a".repeat(121))).toBeNull();
    expect(normalizeName(undefined)).toBeNull();
  });
});
