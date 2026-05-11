import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { currency } from "@/lib/format";
import { getDataset } from "@/lib/repository";
import { LoginForm } from "@/app/login/login-form";

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

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const settings = (await getDataset()).companySettings;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[8px] border border-white/10 bg-[#101413]/90 shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[680px] overflow-hidden border-r border-white/10 bg-[#0b0f0d] p-10 lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(45,212,191,0.18),transparent_40%),linear-gradient(225deg,rgba(245,158,11,0.16),transparent_40%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-[8px] bg-teal-300 text-lg font-black text-zinc-950">
                  {settings.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" src={settings.logoUrl} />
                  ) : (
                    initials(settings.cooperativeName)
                  )}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-teal-200">
                    {settings.cooperativeName}
                  </p>
                  <h1 className="mt-1 text-4xl font-semibold tracking-normal text-white">
                    Gestão profissional de frota cooperada
                  </h1>
                </div>
              </div>
              <p className="mt-6 max-w-xl text-base leading-7 text-zinc-300">
                Controle veículos, manutenção, óleo, combustível, estoque,
                fornecedores, finanças e relatórios em uma central administrativa.
              </p>
            </div>

            <div className="rounded-[8px] border border-white/10 bg-black/24 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Resultado mensal</p>
                  <p className="text-3xl font-semibold text-white">
                    {currency(50353.82, settings.currency)}
                  </p>
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  +8,4%
                </span>
              </div>
              <div className="grid h-44 grid-cols-6 items-end gap-3">
                {[42, 58, 49, 66, 61, 78].map((height, index) => (
                  <div
                    className="rounded-t-[6px] bg-gradient-to-t from-teal-500 to-amber-200"
                    key={index}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center justify-center p-6 sm:p-10">
          <LoginForm settings={settings} />
        </section>
      </div>
    </main>
  );
}
