import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { search } from "@/lib/repository";

export async function GET(request: Request) {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const url = new URL(request.url);
  return NextResponse.json(await search(url.searchParams.get("q") ?? ""));
}
