import { NextResponse } from "next/server";
import { createSession, validateCredentials } from "@/lib/auth";
import { handleApiError, requestAuditMeta } from "@/lib/api";
import { recordActivity } from "@/lib/repository";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await validateCredentials(payload.email, payload.password);

    if (!user) {
      return NextResponse.json(
        { message: "Usuário ou senha inválidos." },
        { status: 401 },
      );
    }

    await createSession(user);
    await recordActivity({
      userName: user.name,
      action: "LOGIN",
      module: "Autenticacao",
      entityId: user.id,
      description: `${user.name} entrou no sistema.`,
      ...requestAuditMeta(request),
    });
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
