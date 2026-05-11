import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getDashboard } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  return NextResponse.json(await getDashboard());
}
