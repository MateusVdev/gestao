import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { getDataset, recordActivity, updateFuelLog } from "@/lib/repository";
import { fuelSchema } from "@/lib/validation";

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
    const before = (await getDataset()).fuelLogs.find((item) => item.id === id);
    const payload = fuelSchema.parse(await request.json());
    const saved = await updateFuelLog(id, payload);
    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Combustivel",
      entityId: id,
      description: `Abastecimento de ${saved.vehicleName} atualizado.`,
      oldValue: before,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
