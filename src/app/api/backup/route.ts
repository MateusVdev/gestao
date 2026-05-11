import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import { createBackup, getBackup, recordActivity, restoreBackup } from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const backup = await getBackup();
  return NextResponse.json(backup, {
    headers: {
      "Content-Disposition": `attachment; filename="coopfleet-backup-${backup.generatedAt.slice(0, 10)}.json"`,
    },
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const record = await createBackup("MANUAL", user.name);
    await recordActivity({
      userName: user.name,
      action: "BACKUP",
      module: "Backup",
      entityId: record.id,
      description: `Backup manual gerado: ${record.fileName}.`,
      ...requestAuditMeta(request),
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const record = await restoreBackup(await request.json(), user.name);
    await recordActivity({
      userName: user.name,
      action: "RESTORE",
      module: "Backup",
      entityId: record.id,
      description: "Backup restaurado pelo painel de configuracoes.",
      ...requestAuditMeta(request),
    });
    return NextResponse.json(record);
  } catch (error) {
    return handleApiError(error);
  }
}
