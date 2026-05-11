import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { getDataset, recordActivity, updateVehicle } from "@/lib/repository";
import { vehicleSchema } from "@/lib/validation";

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
    const before = (await getDataset()).vehicles.find((vehicle) => vehicle.id === id);
    const payload = vehicleSchema.parse(await request.json());
    const saved = await updateVehicle(id, payload);
    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Veiculos",
      entityId: id,
      description: `Veiculo ${saved.plate} editado.`,
      oldValue: before,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
