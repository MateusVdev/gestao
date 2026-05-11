import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { getDataset, recordActivity, updateSupplier } from "@/lib/repository";
import { supplierSchema } from "@/lib/validation";

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
    const before = (await getDataset()).suppliers.find((item) => item.id === id);
    const payload = supplierSchema.parse(await request.json());
    const saved = await updateSupplier(id, payload);
    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Fornecedores",
      entityId: id,
      description: `Fornecedor ${saved.name} atualizado.`,
      oldValue: before,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
