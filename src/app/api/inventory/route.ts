import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createPart, getInventory, recordActivity } from "@/lib/repository";
import { partSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const { partStock } = await getInventory();
  return NextResponse.json(partStock);
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const payload = partSchema.parse(await request.json());
    const saved = await createPart(payload);
    await recordActivity({
      userName: user.name,
      action: "CREATE",
      module: "Estoque",
      entityId: saved.id,
      description: `Peca ${saved.name} criada.`,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
