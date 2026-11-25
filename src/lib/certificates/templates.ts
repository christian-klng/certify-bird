import { db } from "../db";
import { starterDesign, type Design } from "./design";

// Alle Zugriffe sind auf den Mandanten beschränkt: Eine fremde ID findet nichts.

export function listTemplates(organizationId: string) {
  return db().certificateTemplate.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true },
  });
}

export function findTemplate(organizationId: string, id: string) {
  return db().certificateTemplate.findFirst({ where: { id, organizationId } });
}

export function createTemplate(organizationId: string, name: string) {
  return db().certificateTemplate.create({
    data: { organizationId, name, design: starterDesign as object },
    select: { id: true },
  });
}

/** Liefert false, wenn die Vorlage nicht (mehr) zum Mandanten gehört. */
export async function updateTemplate(
  organizationId: string,
  id: string,
  data: { name: string; description: string; design: Design },
): Promise<boolean> {
  const result = await db().certificateTemplate.updateMany({
    where: { id, organizationId },
    data: { name: data.name, description: data.description, design: data.design as object },
  });
  return result.count === 1;
}

export async function deleteTemplate(organizationId: string, id: string): Promise<void> {
  await db().certificateTemplate.deleteMany({ where: { id, organizationId } });
}
