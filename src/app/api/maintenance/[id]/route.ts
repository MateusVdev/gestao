import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { getDataset, recordActivity, updateMaintenance } from "@/lib/repository";
import { maintenanceSchema } from "@/lib/validation";

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
    const before = (await getDataset()).maintenances.find((item) => item.id === id);
    const payload = maintenanceSchema.parse(await request.json());
    const saved = await updateMaintenance(id, payload);
    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Manutencao",
      entityId: id,
      description: `Manutencao de ${saved.vehicleName} atualizada.`,
      oldValue: before,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
