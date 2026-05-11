import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createVehicle, getDataset, recordActivity } from "@/lib/repository";
import { vehicleSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const dataset = await getDataset();
  return NextResponse.json(dataset.vehicles);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = vehicleSchema.parse(await request.json());
    const saved = await createVehicle(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Veiculos",
      entityId: saved.id,
      description: `Veiculo ${saved.plate} cadastrado.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
