import { headers } from "next/headers";
import { readConfig } from "./config";
import { resolveTenant, type TenantResolution } from "./tenant";
import { tenantLookup } from "./tenant-lookup";

/** Ordnet die laufende Anfrage anhand ihres Hostnamens einem Mandanten zu. */
export async function getCurrentTenant(): Promise<TenantResolution> {
  const requestHeaders = await headers();
  return resolveTenant(requestHeaders.get("host"), readConfig(), tenantLookup);
}
