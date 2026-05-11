import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { getDataset, recordActivity, updateFinancialEntry } from "@/lib/repository";
import { financialSchema } from "@/lib/validation";

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
    const before = (await getDataset()).financialEntries.find((item) => item.id === id);
    const payload = financialSchema.parse(await request.json());
    const saved = await updateFinancialEntry(id, payload);
    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Financeiro",
      entityId: id,
      description: `Lancamento financeiro ${saved.description} atualizado.`,
      oldValue: before,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
