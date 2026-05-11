"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import type { CompanySettings } from "@/lib/types";

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CF"
  );
}

export function LoginForm({ settings }: { settings: CompanySettings }) {
  const router = useRouter();
  const [email, setEmail] = useState(() =>
    typeof window === "undefined"
      ? "admin@coopfleet.com"
      : window.localStorage.getItem("coopfleet:remembered-email") ?? "admin@coopfleet.com",
  );
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes("@")) {
      setError("Informe um e-mail valido.");
      return;
    }
    if (password.length < 3) {
      setError("Informe sua senha.");
      return;
    }
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message ?? "Não foi possível entrar.");
      setLoading(false);
      return;
    }

    if (remember) {
      window.localStorage.setItem("coopfleet:remembered-email", email);
    } else {
      window.localStorage.removeItem("coopfleet:remembered-email");
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="w-full max-w-md" onSubmit={onSubmit}>
      <div className="mb-10">
        <div className="mb-5 flex items-center gap-3">
          <div className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-[8px] bg-teal-300 font-black text-zinc-950">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="h-full w-full object-cover" src={settings.logoUrl} />
            ) : (
              initials(settings.cooperativeName)
            )}
            <span className="absolute right-1 bottom-1 grid h-5 w-5 place-items-center rounded-full bg-zinc-950 text-teal-200">
              <Camera size={11} />
            </span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-teal-200">Acesso seguro</p>
            <p className="mt-1 text-xs text-zinc-500">Sessao expira automaticamente</p>
          </div>
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white">
          Entrar no painel {settings.cooperativeName}
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Use as credenciais do administrador para acessar os dados da cooperativa.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-zinc-300">Usuário</span>
          <input
            className="h-12 w-full px-4"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@cooperativa.com"
            type="email"
            value={email}
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-zinc-300">Senha</span>
          <div className="relative">
            <input
              className="h-12 w-full pr-12 pl-4"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={password}
              autoComplete="current-password"
            />
            <button
              className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[8px] text-zinc-400 transition hover:bg-white/8 hover:text-white"
              onClick={() => setShowPassword((value) => !value)}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              type="button"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            type="checkbox"
          />
          Lembrar login
        </label>
        <button
          className="w-fit text-sm text-teal-200 transition hover:text-teal-100"
          onClick={() => {
            setRecoverySent(true);
            setError("");
          }}
          type="button"
        >
          Recuperar senha
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-[8px] border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      {recoverySent ? (
        <p className="mt-4 rounded-[8px] border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Se este e-mail existir, as instrucoes de recuperacao serao enviadas.
        </p>
      ) : null}

      <button
        className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-teal-300 px-5 font-semibold text-zinc-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="mt-5 text-center text-xs text-zinc-500">
        Demonstração: admin@coopfleet.com / admin123
      </p>
    </form>
  );
}
