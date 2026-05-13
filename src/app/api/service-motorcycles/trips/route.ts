import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createMotorcycleTrip, getMotorcycleTrips, recordActivity } from "@/lib/repository";
import { motorcycleTripSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const trips = await getMotorcycleTrips();
  return NextResponse.json(trips);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = motorcycleTripSchema.parse(await request.json());
    const saved = await createMotorcycleTrip(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Motos de Servico",
      entityId: saved.id,
      description: `Saida registrada para ${saved.motorcyclePlate}.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
