import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getReport } from "@/lib/repository";

export async function GET(request: Request) {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const url = new URL(request.url);
  return NextResponse.json(
    await getReport({
      vehicleId: url.searchParams.get("vehicleId") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      annual: url.searchParams.get("period") === "annual",
    }),
  );
}
