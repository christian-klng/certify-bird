import { connection } from "next/server";
import { db } from "@/lib/db";

/** Für Docker und Coolify: meldet, ob App und Datenbank erreichbar sind. */
export async function GET() {
  await connection();
  try {
    await db().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "database-unreachable" }, { status: 503 });
  }
}
