"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  Database,
  Download,
  HardDriveDownload,
  Image as ImageIcon,
  Loader2,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Section } from "@/components/page";
import { broadcastSettings } from "@/components/settings-context";
import type { BackupRecord, CompanySettings } from "@/lib/types";

function formatSize(value: number) {
  if (!value) return "0 KB";
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function SettingsManager({
  backupRecords,
  databaseConfigured,
  initialSettings,
}: {
  backupRecords: BackupRecord[];
  databaseConfigured: boolean;
  initialSettings: CompanySettings;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [records, setRecords] = useState(backupRecords);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lastBackup = records[0];

  function update<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    setLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.message ?? "Nao foi possivel salvar as configuracoes.");
    } else {
      setSettings(body as CompanySettings);
      broadcastSettings(body as CompanySettings);
      setMessage("Configuracoes salvas com sucesso.");
      router.refresh();
    }
    setLoading(false);
  }

  async function createManualBackup() {
    setBackupLoading(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/backup", { method: "POST" });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.message ?? "Nao foi possivel gerar o backup.");
    } else {
      setRecords((items) => [body as BackupRecord, ...items]);
      setMessage("Backup manual gerado com sucesso.");
    }
    setBackupLoading(false);
  }

  async function restoreBackup(file: File | null) {
    if (!file) return;
    setBackupLoading(true);
    setMessage("");
    setError("");

    try {
      const payload = JSON.parse(await file.text());
      const response = await fetch("/api/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.message ?? "Nao foi possivel restaurar o backup.");
      } else {
        setRecords((items) => [body as BackupRecord, ...items]);
        setMessage("Backup restaurado com sucesso.");
      }
    } catch {
      setError("Arquivo de backup invalido.");
    } finally {
      setBackupLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {(message || error) ? (
        <div
          className={`rounded-[8px] border px-4 py-3 text-sm ${
            error
              ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
              : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
          }`}
        >
          {error || message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Section>
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-teal-300/12 text-teal-200">
              <ImageIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Identidade da cooperativa</h2>
              <p className="mt-1 text-sm text-zinc-500">Nome, logo, tema, moeda e timezone.</p>
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Nome da cooperativa">
              <input
                className="h-11 w-full px-3 text-sm"
                onChange={(event) => update("cooperativeName", event.target.value)}
                value={settings.cooperativeName}
              />
            </Field>
            <Field label="Logo da empresa">
              <input
                className="h-11 w-full px-3 text-sm"
                onChange={(event) => update("logoUrl", event.target.value)}
                placeholder="URL da logo"
                value={settings.logoUrl ?? ""}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Tema">
                <select
                  className="h-11 w-full px-3 text-sm"
                  onChange={(event) => update("theme", event.target.value as CompanySettings["theme"])}
                  value={settings.theme}
                >
                  <option value="premium-dark">Premium dark</option>
                  <option value="system">Sistema</option>
                </select>
              </Field>
              <Field label="Moeda">
                <select
                  className="h-11 w-full px-3 text-sm"
                  onChange={(event) => update("currency", event.target.value)}
                  value={settings.currency}
                >
                  <option value="BRL">R$ BRL</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </Field>
              <Field label="Timezone">
                <select
                  className="h-11 w-full px-3 text-sm"
                  onChange={(event) => update("timezone", event.target.value)}
                  value={settings.timezone}
                >
                  <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                  <option value="America/Manaus">America/Manaus</option>
                  <option value="UTC">UTC</option>
                </select>
              </Field>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-teal-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-teal-200 disabled:opacity-60"
              disabled={loading}
              onClick={saveSettings}
              type="button"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              Salvar configuracoes
            </button>
          </div>
        </Section>

        <Section>
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-amber-300/12 text-amber-200">
              <HardDriveDownload size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Backup e restauracao</h2>
              <p className="mt-1 text-sm text-zinc-500">Rotina automatica, retencao, download e restore.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Frequencia">
              <select
                className="h-11 w-full px-3 text-sm"
                onChange={(event) =>
                  update("backupFrequency", event.target.value as CompanySettings["backupFrequency"])
                }
                value={settings.backupFrequency}
              >
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field label="Retencao">
              <input
                className="h-11 w-full px-3 text-sm"
                min={1}
                onChange={(event) => update("backupRetentionDays", Number(event.target.value))}
                type="number"
                value={settings.backupRetentionDays}
              />
            </Field>
            <Field label="Origem">
              <div className="flex h-11 items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.03] px-3 text-sm text-zinc-300">
                <Database size={16} />
                {databaseConfigured ? "PostgreSQL" : "Local"}
              </div>
            </Field>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Ultimo backup</p>
              <p className="mt-2 text-sm font-medium text-white">{lastBackup?.createdAt.slice(0, 16) ?? "-"}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Status</p>
              <p className="mt-2 text-sm font-medium text-white">{lastBackup?.status ?? "Pendente"}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Tamanho</p>
              <p className="mt-2 text-sm font-medium text-white">{formatSize(lastBackup?.size ?? 0)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-teal-300 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-teal-200 disabled:opacity-60"
              disabled={backupLoading}
              onClick={createManualBackup}
              type="button"
            >
              {backupLoading ? <Loader2 className="animate-spin" size={16} /> : <HardDriveDownload size={16} />}
              Backup manual
            </button>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7"
              href="/api/backup"
            >
              <Download size={16} />
              Baixar backup
            </a>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7">
              <RotateCcw size={16} />
              Restaurar
              <input
                accept="application/json"
                className="sr-only"
                onChange={(event) => restoreBackup(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
          </div>
        </Section>
      </div>

      <Section>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <Bell size={16} className="text-teal-200" />
              Notificacoes
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={settings.notificationsEnabled}
                onChange={(event) => update("notificationsEnabled", event.target.checked)}
                type="checkbox"
              />
              Ativar notificacoes operacionais
            </label>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <Clock size={16} className="text-amber-200" />
              Sessao
            </div>
            <input
              className="h-10 w-full px-3 text-sm"
              min={15}
              onChange={(event) => update("sessionTimeoutMinutes", Number(event.target.value))}
              type="number"
              value={settings.sessionTimeoutMinutes}
            />
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck size={16} className="text-emerald-200" />
              Preparado
            </div>
            <p className="text-sm leading-6 text-zinc-500">
              Estrutura pronta para 2FA, permissoes avancadas e multiusuario.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <div className="mb-4 flex items-center gap-2">
          <Moon size={17} className="text-teal-200" />
          <h2 className="text-sm font-semibold text-white">Historico de backups</h2>
        </div>
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4 font-medium">Data</th>
                <th className="py-3 pr-4 font-medium">Tipo</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Arquivo</th>
                <th className="py-3 pr-4 text-right font-medium">Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 10).map((record) => (
                <tr className="border-b border-white/6 last:border-0" key={record.id}>
                  <td className="py-3 pr-4 text-zinc-400">{record.createdAt.slice(0, 16)}</td>
                  <td className="py-3 pr-4 text-zinc-300">{record.type}</td>
                  <td className="py-3 pr-4 text-zinc-300">{record.status}</td>
                  <td className="py-3 pr-4 text-zinc-500">{record.fileName}</td>
                  <td className="py-3 pr-4 text-right text-zinc-300">{formatSize(record.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
