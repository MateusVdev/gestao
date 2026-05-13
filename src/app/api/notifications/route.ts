import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getNotifications } from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const notifications = await getNotifications();
  return NextResponse.json(notifications);
}
