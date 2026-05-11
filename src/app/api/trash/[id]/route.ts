import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { permanentlyDeleteItem, recordActivity } from "@/lib/repository";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ message: "Apenas administradores podem excluir definitivamente." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const result = await permanentlyDeleteItem(id);
    await recordActivity({
      userName: user.name,
      action: "PURGE",
      module: "Lixeira",
      entityId: id,
      description: "Item removido definitivamente da lixeira.",
      ...requestAuditMeta(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
