import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createFuelLog, getFuelLogs, recordActivity } from "@/lib/repository";
import { fuelSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const fuelLogs = await getFuelLogs();
  return NextResponse.json(fuelLogs);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = fuelSchema.parse(await request.json());
    const saved = await createFuelLog(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Combustivel",
      entityId: saved.id,
      description: `Abastecimento registrado para ${saved.vehicleName}.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
