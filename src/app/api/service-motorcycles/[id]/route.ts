import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { getServiceMotorcycle, recordActivity, updateServiceMotorcycle } from "@/lib/repository";
import { serviceMotorcycleSchema } from "@/lib/validation";

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
    const before = await getServiceMotorcycle(id);
    const payload = serviceMotorcycleSchema.parse(await request.json());
    const saved = await updateServiceMotorcycle(id, payload);
    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Motos de Servico",
      entityId: id,
      description: `Moto ${saved.plate} atualizada.`,
      oldValue: before,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
