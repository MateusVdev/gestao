"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  History,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { EmptyState, Section } from "@/components/page";
import { cn, date } from "@/lib/format";
import type { ActivityLog, AppNotification, AuditTrailEntry } from "@/lib/types";

type SortKey = "date" | "userName" | "action" | "module" | "ipAddress";
type TabKey = "activity" | "audit" | "notifications";

const pageSize = 12;

const columns = [
  { key: "date", label: "Data" },
  { key: "time", label: "Horario" },
  { key: "userName", label: "Usuario" },
  { key: "action", label: "Acao" },
  { key: "module", label: "Modulo" },
  { key: "ipAddress", label: "IP" },
  { key: "device", label: "Dispositivo" },
  { key: "description", label: "Descricao" },
] as const;

function priorityClass(priority: string) {
  const classes: Record<string, string> = {
    LOW: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    MEDIUM: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    HIGH: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    CRITICAL: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };
  return classes[priority] || classes.MEDIUM;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    CRITICAL: "Critica",
  };
  return labels[priority] || priority;
}

function statusBadge(status: string) {
  const classes: Record<string, string> = {
    UNREAD: "bg-teal-300 text-zinc-950",
    READ: "bg-white/10 text-zinc-400",
    RESOLVED: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  };
  const labels: Record<string, string> = {
    UNREAD: "Nova",
    READ: "Lida",
    RESOLVED: "Resolvida",
  };
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-wider", classes[status])}>
      {labels[status]}
    </span>
  );
}

function actionClass(action: string) {
  if (["DELETE", "RESTORE"].includes(action)) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }
  if (["UPDATE", "PUT"].includes(action)) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }
  if (["LOGIN", "LOGOUT", "CREATE", "POST"].includes(action)) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  return "border-sky-400/30 bg-sky-400/10 text-sky-200";
}

function logValue(log: ActivityLog, key: (typeof columns)[number]["key"]) {
  if (key === "date") return log.date ?? log.createdAt.slice(0, 10);
  if (key === "time") return log.time ?? "00:00:00";
  if (key === "module") return log.module ?? log.entity;
  if (key === "ipAddress") return log.ipAddress ?? "-";
  return String(log[key] ?? "-");
}

export function LogsManager({
  auditTrail,
  logs,
  notifications,
}: {
  auditTrail: AuditTrailEntry[];
  logs: ActivityLog[];
  notifications: AppNotification[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("activity");
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [visible, setVisible] = useState(() => new Set(columns.map((column) => column.key)));

  const modules = useMemo(
    () => Array.from(new Set(logs.map((log) => log.module ?? log.entity))).sort(),
    [logs],
  );
  const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action))).sort(), [logs]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return logs
      .filter((log) => {
        const sameModule = moduleFilter === "all" || (log.module ?? log.entity) === moduleFilter;
        const sameAction = actionFilter === "all" || log.action === actionFilter;
        const text = [
          log.userName,
          log.action,
          log.module ?? log.entity,
          log.ipAddress,
          log.device,
          log.description,
        ]
          .join(" ")
          .toLowerCase();
        return sameModule && sameAction && (!normalized || text.includes(normalized));
      })
      .toSorted((a, b) => {
        const first = logValue(a, sortKey);
        const second = logValue(b, sortKey);
        const result = first.localeCompare(second, "pt-BR", { numeric: true });
        return direction === "asc" ? result : -result;
      });
  }, [actionFilter, direction, logs, moduleFilter, query, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateSort(key: SortKey) {
    setSortKey((current) => {
      if (current === key) {
        setDirection((value) => (value === "asc" ? "desc" : "asc"));
        return current;
      }
      setDirection("asc");
      return key;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-[10px] border border-white/10 bg-white/[0.03] p-1 w-fit">
        <button
          className={cn(
            "flex h-9 items-center gap-2 rounded-[7px] px-4 text-xs font-bold transition",
            activeTab === "activity" ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300",
          )}
          onClick={() => setActiveTab("activity")}
        >
          <History size={14} />
          Atividades
        </button>
        <button
          className={cn(
            "flex h-9 items-center gap-2 rounded-[7px] px-4 text-xs font-bold transition",
            activeTab === "audit" ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300",
          )}
          onClick={() => setActiveTab("audit")}
        >
          <Search size={14} />
          Auditoria
        </button>
        <button
          className={cn(
            "flex h-9 items-center gap-2 rounded-[7px] px-4 text-xs font-bold transition",
            activeTab === "notifications" ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300",
          )}
          onClick={() => setActiveTab("notifications")}
        >
          <Bell size={14} />
          Notificacoes
        </button>
      </div>

      {activeTab === "activity" && (
        <>
          <Section>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_170px] xl:w-[760px]">
                <label className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" size={16} />
                  <input
                    className="h-10 w-full pl-10 pr-3 text-sm"
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Pesquisar usuario, acao, IP ou descricao"
                    value={query}
                  />
                </label>
                <label className="relative">
                  <SlidersHorizontal className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" size={16} />
                  <select
                    className="h-10 w-full pl-10 pr-3 text-sm"
                    onChange={(event) => {
                      setModuleFilter(event.target.value);
                      setPage(1);
                    }}
                    value={moduleFilter}
                  >
                    <option value="all">Todos modulos</option>
                    {modules.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                </label>
                <select
                  className="h-10 w-full px-3 text-sm"
                  onChange={(event) => {
                    setActionFilter(event.target.value);
                    setPage(1);
                  }}
                  value={actionFilter}
                >
                  <option value="all">Todas acoes</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7"
                  href="/api/logs/export/pdf"
                >
                  <FileText size={16} />
                  PDF
                </Link>
                <Link
                  className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-teal-300 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-teal-200"
                  href="/api/logs/export/excel"
                >
                  <FileSpreadsheet size={16} />
                  Excel
                </Link>
              </div>
            </div>
          </Section>

          <Section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">{filtered.length} registros encontrados</p>
              <div className="flex flex-wrap gap-2">
                {columns.map((column) => (
                  <label
                    className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/10 px-2 text-xs text-zinc-300"
                    key={column.key}
                  >
                    <input
                      checked={visible.has(column.key)}
                      className="h-3.5 w-3.5"
                      onChange={() =>
                        setVisible((current) => {
                          const next = new Set(current);
                          if (next.has(column.key) && next.size > 1) {
                            next.delete(column.key);
                          } else {
                            next.add(column.key);
                          }
                          return next;
                        })
                      }
                      type="checkbox"
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            </div>

            {paginated.length ? (
              <div className="table-scroll overflow-x-auto">
                <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                    <tr className="border-b border-white/10">
                      {columns
                        .filter((column) => visible.has(column.key))
                        .map((column) => (
                          <th className="resize-x overflow-auto py-3 pr-4 font-medium" key={column.key}>
                            {["date", "userName", "action", "module", "ipAddress"].includes(column.key) ? (
                              <button
                                className="inline-flex items-center gap-1 transition hover:text-white"
                                onClick={() => updateSort(column.key as SortKey)}
                                type="button"
                              >
                                {column.label}
                                <ChevronsUpDown size={13} />
                              </button>
                            ) : (
                              column.label
                            )}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((log) => (
                      <tr className="border-b border-white/6 transition hover:bg-white/[0.03] last:border-0" key={log.id}>
                        {columns
                          .filter((column) => visible.has(column.key))
                          .map((column) => (
                            <td className="break-words py-3 pr-4 align-top text-zinc-400" key={column.key}>
                              {column.key === "action" ? (
                                <span className={cn("rounded-full border px-2 py-1 text-xs", actionClass(log.action))}>
                                  {log.action}
                                </span>
                              ) : column.key === "description" ? (
                                <span className="text-zinc-300">{log.description}</span>
                              ) : (
                                logValue(log, column.key)
                              )}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>Nenhum log encontrado com os filtros atuais.</EmptyState>
            )}

            <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-500">
                Pagina {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7 disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7 disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  type="button"
                >
                  Proxima
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </Section>
        </>
      )}

      {activeTab === "audit" && (
        <Section>
          <h2 className="mb-4 text-sm font-semibold text-white">Auditoria de alteracoes</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {auditTrail.slice(0, 20).map((entry) => (
              <article className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4" key={entry.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{entry.module}</p>
                  <span className="text-xs text-zinc-500">{date(entry.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{entry.summary}</p>
                <div className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
                  <pre className="max-h-36 overflow-auto rounded-[8px] bg-black/20 p-2 text-[10px] font-mono leading-relaxed">
                    {JSON.stringify(entry.oldValue ?? {}, null, 2)}
                  </pre>
                  <pre className="max-h-36 overflow-auto rounded-[8px] bg-black/20 p-2 text-[10px] font-mono leading-relaxed">
                    {JSON.stringify(entry.newValue ?? {}, null, 2)}
                  </pre>
                </div>
              </article>
            ))}
          </div>
        </Section>
      )}

      {activeTab === "notifications" && (
        <Section>
          <div className="mb-6 flex items-center justify-between gap-4">
             <div>
               <h2 className="text-sm font-semibold text-white">Historico de Notificacoes</h2>
               <p className="text-xs text-zinc-500 mt-1">Alertas operacionais e registros de resolucao automatica.</p>
             </div>
             <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-400">
               {notifications.length} registros
             </span>
          </div>

          <div className="space-y-3">
             {notifications.length ? (
               notifications.map((n) => (
                 <div className="group relative flex flex-col rounded-[8px] border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]" key={n.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                       <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                             {statusBadge(n.status)}
                             <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", priorityClass(n.priority))}>
                               Prioridade {priorityLabel(n.priority)}
                             </span>
                          </div>
                          <h3 className="mt-3 text-sm font-bold text-white uppercase tracking-tight">{n.title}</h3>
                          <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{n.message}</p>
                       </div>
                       <div className="flex flex-col items-end gap-2 text-right">
                          <p className="text-xs font-medium text-zinc-500">{date(n.createdAt)}</p>
                          {n.link && (
                            <Link 
                              href={n.link} 
                              className="inline-flex items-center gap-2 rounded-[6px] border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-zinc-300 transition hover:bg-teal-300 hover:text-zinc-950"
                            >
                              <ExternalLink size={12} />
                              Acessar Modulo
                            </Link>
                          )}
                       </div>
                    </div>
                 </div>
               ))
             ) : (
               <EmptyState>Nenhum registro de notificacao encontrado.</EmptyState>
             )}
          </div>
        </Section>
      )}
    </div>
  );
}
