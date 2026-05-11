import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import {
  getDataset,
  recordActivity,
  updateMotorcycleFinePayment,
} from "@/lib/repository";
import { motorcycleFinePaymentSchema } from "@/lib/validation";

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
    const before = (await getDataset()).motorcycleFines.find((fine) => fine.id === id);
    const payload = motorcycleFinePaymentSchema.parse(await request.json());
    const saved = await updateMotorcycleFinePayment(id, payload, user.name);

    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Multas",
      entityId: id,
      description: `Pagamento da multa ${saved.motorcyclePlate} atualizado por ${user.name}.`,
      oldValue: before,
      newValue: saved,
      metadata: {
        paidBy: saved.paidBy,
        authorizedBy: saved.authorizedBy,
        paymentStatus: saved.paymentStatus,
      },
      ...requestAuditMeta(request),
    });

    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
