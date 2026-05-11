import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { deleteAttachment, recordActivity } from "@/lib/repository";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const result = await deleteAttachment(id);
    await recordActivity({
      userName: user.name,
      action: "DELETE",
      module: "Anexos",
      entityId: id,
      description: "Anexo removido do registro.",
      ...requestAuditMeta(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
