import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";

export async function requireSession() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ message: "Sessão expirada." }, { status: 401 }),
    };
  }

  return { user, response: null };
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Dados inválidos.",
        issues: error.issues,
      },
      { status: 422 },
    );
  }

  const message = error instanceof Error ? error.message : "Não foi possível concluir a ação.";
  return NextResponse.json({ message }, { status: 400 });
}

export function requestAuditMeta(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipAddress =
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1";
  const userAgent = request.headers.get("user-agent") ?? "Dispositivo desconhecido";
  const device = userAgent.includes("Mobile")
    ? "Dispositivo movel"
    : userAgent.includes("Windows")
      ? "Windows"
      : userAgent.includes("Mac")
        ? "macOS"
        : userAgent.includes("Linux")
          ? "Linux"
          : "Navegador";

  return { ipAddress, device };
}
