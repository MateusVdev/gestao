import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { getSettings, recordActivity, updateCompanySettings } from "@/lib/repository";
import { companySettingsSchema } from "@/lib/validation";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const before = await getSettings();
    const payload = companySettingsSchema.parse(await request.json());
    const saved = await updateCompanySettings(payload);
    await recordActivity({
      userName: user.name,
      action: "UPDATE",
      module: "Configuracoes",
      description: "Configuracoes profissionais da cooperativa atualizadas.",
      oldValue: before,
      newValue: saved,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(saved);
  } catch (error) {
    return handleApiError(error);
  }
}
