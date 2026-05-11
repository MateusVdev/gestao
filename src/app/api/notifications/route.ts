import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getDataset } from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const dataset = await getDataset();
  return NextResponse.json(dataset.notifications);
}
