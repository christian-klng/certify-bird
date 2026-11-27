import { describe, expect, it } from "vitest";
import { classifyOrigin, rejectionText } from "./origin-check";

describe("classifyOrigin", () => {
  it("erkennt dieselbe Adresse, auch mit Port und Großschreibung", () => {
    expect(classifyOrigin("https://my.example.org", "my.example.org")).toBe("same");
    expect(classifyOrigin("http://Demo.localhost:3000", "demo.localhost:3000")).toBe("same");
  });

  it("erkennt ein abgeschirmtes Fenster an der Herkunft null", () => {
    expect(classifyOrigin("null", "my.example.org")).toBe("opaque");
  });

  it.each([
    ["andere Adresse", "https://evil.example", "my.example.org"],
    ["anderer Port", "http://localhost:4000", "localhost:3000"],
    ["andere Subdomain", "https://a.example.org", "b.example.org"],
    ["keine Angabe", null, "my.example.org"],
    ["leere Angabe", "", "my.example.org"],
    ["unlesbare Angabe", "kein-url", "my.example.org"],
    ["kein Host", "https://my.example.org", null],
  ])("lehnt ab: %s", (_name, origin, host) => {
    expect(classifyOrigin(origin, host)).toBe("foreign");
  });
});

describe("rejectionText", () => {
  it("erklärt beim abgeschirmten Fenster, was zu tun ist", () => {
    expect(rejectionText("opaque")).toContain("neuen Tab");
    expect(rejectionText("foreign")).not.toContain("neuen Tab");
  });
});
