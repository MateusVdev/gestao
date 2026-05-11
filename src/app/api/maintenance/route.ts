import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createMaintenance, getDataset, recordActivity } from "@/lib/repository";
import { maintenanceSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const dataset = await getDataset();
  return NextResponse.json(dataset.maintenances);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = maintenanceSchema.parse(await request.json());
    const saved = await createMaintenance(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Manutencao",
      entityId: saved.id,
      description: `Manutencao registrada para ${saved.vehicleName}.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
