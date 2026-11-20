import { scanAll } from "../../../lib/sources";
export const revalidate = 300; // re-scan at most every 5 minutes
export const dynamic = "force-static";
export const maxDuration = 60;
export async function GET() {
  return Response.json(await scanAll());
}
