import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createFinancialEntry, getFinanceEntries, recordActivity } from "@/lib/repository";
import { financialSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const entries = await getFinanceEntries();
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = financialSchema.parse(await request.json());
    const saved = await createFinancialEntry(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Financeiro",
      entityId: saved.id,
      description: `Lancamento financeiro criado em ${saved.category}.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
