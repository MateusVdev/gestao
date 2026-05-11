import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { deletePart, getDataset, recordActivity, updatePart } from "@/lib/repository";
import { partSchema } from "@/lib/validation";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const before = (await getDataset()).partStock.find((part) => part.id === id);
    const payload = partSchema.parse(await request.json());
    const saved = await updatePart(id, payload);
    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Estoque",
      entityId: id,
      description: `Peca ${saved.name} atualizada.`,
      oldValue: before,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const before = (await getDataset()).partStock.find((part) => part.id === id);
    const result = await deletePart(id, user.name);
    await recordActivity({
      userName: user.name,
      action: "DELETE",
      module: "Estoque",
      entityId: id,
      description: before ? `Peca ${before.name} movida para lixeira.` : "Peca movida para lixeira.",
      oldValue: before,
      ...requestAuditMeta(_request),
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
