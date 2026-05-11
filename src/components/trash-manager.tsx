"use client";

import { useState } from "react";
import { ArchiveRestore, ShieldAlert, Trash2 } from "lucide-react";
import { EmptyState, Section } from "@/components/page";
import type { AppUser, DeletedItem } from "@/lib/types";

export function TrashManager({
  items,
  user,
}: {
  items: DeletedItem[];
  user: AppUser;
}) {
  const [rows, setRows] = useState(items);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function restore(id: string) {
    setLoadingId(id);
    setError("");
    const response = await fetch(`/api/trash/${id}/restore`, { method: "PATCH" });
    if (response.ok) {
      setRows((current) => current.filter((item) => item.id !== id));
    } else {
      const body = await response.json().catch(() => null);
      setError(body?.message ?? "Nao foi possivel restaurar.");
    }
    setLoadingId(null);
  }

  async function purge(id: string) {
    setLoadingId(id);
    setError("");
    const response = await fetch(`/api/trash/${id}`, { method: "DELETE" });
    if (response.ok) {
      setRows((current) => current.filter((item) => item.id !== id));
    } else {
      const body = await response.json().catch(() => null);
      setError(body?.message ?? "Nao foi possivel excluir definitivamente.");
    }
    setLoadingId(null);
  }

  return (
    <Section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Lixeira operacional</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Exclusoes sao preservadas para restauracao e auditoria.
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
          {rows.length} itens removidos
        </span>
      </div>

      {error ? (
        <p className="mb-4 rounded-[8px] border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      {rows.length ? (
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4 font-medium">Item</th>
                <th className="py-3 pr-4 font-medium">Modulo</th>
                <th className="py-3 pr-4 font-medium">Removido por</th>
                <th className="py-3 pr-4 font-medium">Data</th>
                <th className="py-3 pr-4 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr className="border-b border-white/6 last:border-0" key={item.id}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.entityId}</p>
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">{item.entity}</td>
                  <td className="py-3 pr-4 text-zinc-400">{item.deletedBy}</td>
                  <td className="py-3 pr-4 text-zinc-400">{item.deletedAt.slice(0, 10)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-emerald-400/25 px-3 text-xs text-emerald-200 transition hover:bg-emerald-400/10 disabled:opacity-50"
                        disabled={loadingId === item.id}
                        onClick={() => restore(item.id)}
                        type="button"
                      >
                        <ArchiveRestore size={14} />
                        Restaurar
                      </button>
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-rose-400/25 px-3 text-xs text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-50"
                        disabled={loadingId === item.id || user.role !== "ADMIN"}
                        onClick={() => purge(item.id)}
                        title={user.role !== "ADMIN" ? "Somente administrador" : "Excluir definitivamente"}
                        type="button"
                      >
                        <Trash2 size={14} />
                        Definitivo
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>Nenhum item removido no momento.</EmptyState>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-[8px] border border-amber-400/20 bg-amber-400/8 p-4 text-sm text-amber-100">
        <ShieldAlert className="mt-0.5 shrink-0" size={18} />
        <p>
          Exclusao definitiva fica bloqueada para operadores e deve ser usada apenas quando a
          retencao administrativa permitir.
        </p>
      </div>
    </Section>
  );
}
