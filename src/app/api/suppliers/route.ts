import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createSupplier, getSuppliers, recordActivity } from "@/lib/repository";
import { supplierSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const suppliers = await getSuppliers();
  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = supplierSchema.parse(await request.json());
    const saved = await createSupplier(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Fornecedores",
      entityId: saved.id,
      description: `Fornecedor ${saved.name} cadastrado.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
