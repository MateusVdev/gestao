import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { requestAuditMeta } from "@/lib/api";
import { recordActivity } from "@/lib/repository";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await recordActivity({
      userName: user.name,
      action: "LOGOUT",
      module: "Autenticacao",
      entityId: user.id,
      description: `${user.name} saiu do sistema.`,
      ...requestAuditMeta(request),
    });
  }
  return NextResponse.json({ ok: true });
}
