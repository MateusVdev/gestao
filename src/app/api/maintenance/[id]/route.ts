import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import {
  concludeMaintenance,
  getMaintenances,
  recordActivity,
  updateMaintenance,
  updateMaintenanceStatus,
} from "@/lib/repository";
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
    const records = await getMaintenances();
    const before = records.find((item) => item.id === id);
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const { id } = await context.params;
    const { action, status } = await request.json();

    if (action === "CONCLUDE") {
      const saved = await concludeMaintenance(id, user.name);
      await recordActivity({
        userName: user.name,
        action: "UPDATE",
        module: "Manutencao",
        entityId: id,
        description: `Manutencao concluida para registro #${id}.`,
        newValue: saved,
        ...requestAuditMeta(request),
      });
      return NextResponse.json(saved);
    }

    if (action === "STATUS") {
      const saved = await updateMaintenanceStatus(id, status);
      await recordActivity({
        userName: user.name,
        action: "UPDATE",
        module: "Manutencao",
        entityId: id,
        description: `Status da manutencao alterado para ${status}.`,
        newValue: saved,
        ...requestAuditMeta(request),
      });
      return NextResponse.json(saved);
    }

    throw new Error("Acao invalida.");
  } catch (error) {
    return handleApiError(error);
  }
}
