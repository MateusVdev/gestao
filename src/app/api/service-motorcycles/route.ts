import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createServiceMotorcycle, getServiceMotorcycles, recordActivity } from "@/lib/repository";
import { serviceMotorcycleSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const motorcycles = await getServiceMotorcycles();
  return NextResponse.json(motorcycles);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = serviceMotorcycleSchema.parse(await request.json());
    const saved = await createServiceMotorcycle(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Motos de Servico",
      entityId: saved.id,
      description: `Moto ${saved.plate} cadastrada.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
