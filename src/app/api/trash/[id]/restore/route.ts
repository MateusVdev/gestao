import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { recordActivity, restoreDeletedItem } from "@/lib/repository";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const result = await restoreDeletedItem(id, user.name);
    await recordActivity({
      userName: user.name,
      action: "RESTORE",
      module: "Lixeira",
      entityId: id,
      description: "Item restaurado pela lixeira.",
      ...requestAuditMeta(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
