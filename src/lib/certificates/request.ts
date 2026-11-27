import { getCurrentMember, rejectForeignOrigin, type CurrentMember } from "../auth/request";
import { MAX_DESIGN_BYTES } from "./design";

/**
 * Gemeinsame Prüfung für die Vorlagen-Routen: eigene Herkunft und angemeldetes
 * Mitglied. Liefert sonst die passende Fehlerantwort.
 */
export async function requireMember(request: Request): Promise<CurrentMember | Response> {
  const rejected = rejectForeignOrigin(request);
  if (rejected) return rejected;
  return (await getCurrentMember()) ?? new Response("Bitte melde dich neu an.", { status: 401 });
}

/** Liest den JSON-Körper mit Größenbegrenzung; undefined bei Fehlern. */
export async function readJson(request: Request): Promise<unknown> {
  // Etwas Luft für Name und Beschreibung neben der Gestaltung.
  const limit = MAX_DESIGN_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length") ?? 0) > limit) return undefined;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > limit) return undefined;
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return undefined;
  }
}
