import { NextResponse } from "next/server";
import { handleApiError, requireSession } from "@/lib/api";
import { markNotificationRead } from "@/lib/repository";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  try {
    const { id } = await context.params;
    return NextResponse.json(await markNotificationRead(id));
  } catch (error) {
    return handleApiError(error);
  }
}
