import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createOilChange, getOilChanges, recordActivity } from "@/lib/repository";
import { oilSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const oilChanges = await getOilChanges();
  return NextResponse.json(oilChanges);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = oilSchema.parse(await request.json());
    const saved = await createOilChange(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Oleo",
      entityId: saved.id,
      description: `Troca de oleo registrada para ${saved.vehicleName}.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
