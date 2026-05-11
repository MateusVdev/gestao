import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createStockEntry, recordActivity } from "@/lib/repository";
import { stockEntrySchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = stockEntrySchema.parse(await request.json());
    const saved = await createStockEntry(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Estoque",
      entityId: saved.id,
      description: `Entrada de ${saved.quantity} unidade(s) em ${saved.partName}.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
