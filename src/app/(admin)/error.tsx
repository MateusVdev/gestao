"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Section } from "@/components/page";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
      <Section className="flex max-w-md flex-col items-center text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-rose-400/10 text-rose-400">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-semibold text-white">Ops! Algo deu errado.</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Ocorreu um erro ao carregar esta pagina. Tente recarregar ou contate o suporte se o problema persistir.
        </p>
        <button
          className="mt-6 flex h-11 items-center gap-2 rounded-[8px] bg-white/5 px-6 text-sm font-medium text-white transition hover:bg-white/10"
          onClick={() => reset()}
          type="button"
        >
          <RotateCcw size={16} />
          Tentar novamente
        </button>
      </Section>
    </div>
  );
}
