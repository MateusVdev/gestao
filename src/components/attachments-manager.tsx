"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  Download,
  Eye,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Upload,
  UserCircle,
} from "lucide-react";
import { EmptyState, Section } from "@/components/page";
import type { Attachment, AttachmentOwnerType, Dataset } from "@/lib/types";

type OwnerOption = {
  type: AttachmentOwnerType;
  id: string;
  label: string;
  module: string;
};

function formatSize(value: number) {
  if (value > 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildOwners(dataset: Dataset): OwnerOption[] {
  return [
    ...dataset.vehicles.map((vehicle) => ({
      type: "vehicle" as const,
      id: vehicle.id,
      label: `${vehicle.name} - ${vehicle.plate}`,
      module: "Veiculos",
    })),
    ...dataset.maintenances.map((maintenance) => ({
      type: "maintenance" as const,
      id: maintenance.id,
      label: `${maintenance.vehicleName} - ${maintenance.type}`,
      module: "Manutencao",
    })),
    ...dataset.oilChanges.map((oil) => ({
      type: "oil" as const,
      id: oil.id,
      label: `${oil.vehicleName} - ${oil.oilType}`,
      module: "Oleo",
    })),
    ...dataset.fuelLogs.map((fuel) => ({
      type: "fuel" as const,
      id: fuel.id,
      label: `${fuel.vehicleName} - ${fuel.station}`,
      module: "Combustivel",
    })),
    ...dataset.motorcycleFines.map((fine) => ({
      type: "fine" as const,
      id: fine.id,
      label: `${fine.motorcyclePlate} - ${fine.reason}`,
      module: "Multas",
    })),
    ...dataset.suppliers.map((supplier) => ({
      type: "supplier" as const,
      id: supplier.id,
      label: supplier.name,
      module: "Fornecedores",
    })),
    ...dataset.partStock.map((part) => ({
      type: "inventory" as const,
      id: part.id,
      label: `${part.name} - ${part.sku}`,
      module: "Estoque",
    })),
    ...dataset.serviceMotorcycles.map((motorcycle) => ({
      type: "motorcycle" as const,
      id: motorcycle.id,
      label: `${motorcycle.brand} ${motorcycle.model} - ${motorcycle.plate}`,
      module: "Motos",
    })),
  ];
}

export function AttachmentsManager({ dataset }: { dataset: Dataset }) {
  const owners = useMemo(() => buildOwners(dataset), [dataset]);
  const [attachments, setAttachments] = useState(dataset.attachments);
  const [ownerKey, setOwnerKey] = useState(() => {
    const owner = owners[0];
    return owner ? `${owner.type}:${owner.id}` : "";
  });
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedOwner = owners.find((owner) => `${owner.type}:${owner.id}` === ownerKey);
  const visibleAttachments = selectedOwner
    ? attachments.filter(
        (attachment) =>
          attachment.ownerType === selectedOwner.type && attachment.ownerId === selectedOwner.id,
      )
    : attachments;

  async function upload() {
    if (!selectedOwner || !file) {
      setError("Selecione um registro e um arquivo.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("ownerType", selectedOwner.type);
    formData.set("ownerId", selectedOwner.id);
    formData.set("ownerLabel", selectedOwner.label);
    formData.set("module", selectedOwner.module);
    formData.set("description", description);
    formData.set("file", file);

    const response = await fetch("/api/attachments", {
      method: "POST",
      body: formData,
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.message ?? "Nao foi possivel enviar o anexo.");
      setLoading(false);
      return;
    }

    setAttachments((items) => [body as Attachment, ...items]);
    setFile(null);
    setDescription("");
    setLoading(false);
  }

  async function remove(id: string) {
    setLoading(true);
    const response = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    if (response.ok) {
      setAttachments((items) => items.filter((attachment) => attachment.id !== id));
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
      <Section>
        <div className="mb-5 flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-teal-300/12 text-teal-200">
            <Upload size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Enviar anexo</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Fotos, PDFs, notas fiscais e comprovantes vinculados ao registro correto.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Registro
            </span>
            <select
              className="h-11 w-full px-3 text-sm"
              onChange={(event) => setOwnerKey(event.target.value)}
              value={ownerKey}
            >
              {owners.map((owner) => (
                <option key={`${owner.type}:${owner.id}`} value={`${owner.type}:${owner.id}`}>
                  {owner.module} - {owner.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Arquivo
            </span>
            <input
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              className="block w-full cursor-pointer rounded-[8px] border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-zinc-400"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Descricao / Motivo
            </span>
            <textarea
              className="min-h-24 w-full resize-y px-3 py-2 text-sm"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: nota fiscal do pneu, comprovante de pagamento, multa da moto"
              value={description}
            />
          </label>

          {file ? (
            <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
              <p className="font-medium text-white">{file.name}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {file.type || "arquivo"} - {formatSize(file.size)}
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-[8px] border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-teal-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60"
            disabled={loading}
            onClick={upload}
            type="button"
          >
            <Paperclip size={17} />
            {loading ? "Processando..." : "Adicionar anexo"}
          </button>
        </div>
      </Section>

      <Section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Anexos do registro</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {selectedOwner ? selectedOwner.label : "Todos os registros"}
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
            {visibleAttachments.length} arquivos
          </span>
        </div>

        {visibleAttachments.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleAttachments.map((attachment) => {
              const isImage = attachment.fileType.startsWith("image/");
              const isPdf = attachment.fileType.includes("pdf");
              const TypeIcon = isImage ? ImageIcon : isPdf ? FileText : FileArchive;

              return (
                <article className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3" key={attachment.id}>
                  <div className="flex gap-3">
                    <a
                      className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-white/10 bg-black/20"
                      href={attachment.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={attachment.url} />
                      ) : (
                        <TypeIcon className="text-zinc-500" size={26} />
                      )}
                    </a>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{attachment.fileName}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {attachment.module} - {attachment.ownerLabel}
                      </p>
                      {attachment.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-300">
                          {attachment.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-500">
                        {attachment.fileType || "arquivo"} - {formatSize(attachment.fileSize)}
                      </p>
                      <div className="mt-2 grid gap-1 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock size={13} />
                          {formatDate(attachment.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <UserCircle size={13} />
                          {attachment.uploadedBy}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/10 px-2 text-xs text-zinc-200 transition hover:bg-white/7"
                          href={attachment.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Eye size={14} />
                          Visualizar
                        </a>
                        <a
                          className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/10 px-2 text-xs text-zinc-200 transition hover:bg-white/7"
                          href={attachment.url}
                          download
                        >
                          <Download size={14} />
                          Baixar
                        </a>
                        <button
                          className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-rose-400/25 px-2 text-xs text-rose-200 transition hover:bg-rose-400/10"
                          disabled={loading}
                          onClick={() => remove(attachment.id)}
                          type="button"
                        >
                          <Trash2 size={14} />
                          Remover
                        </button>
                      </div>
                    </div>
                    {isImage ? <ImageIcon className="mt-1 shrink-0 text-teal-200" size={16} /> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState>Nenhum anexo vinculado a este registro.</EmptyState>
        )}
      </Section>
    </div>
  );
}
