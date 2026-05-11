"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Bike,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Gauge,
  History,
  ImageIcon,
  MapPin,
  PlusCircle,
  Save,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Section } from "@/components/page";
import { cn, currency, motorcycleStatusClass, motorcycleStatusLabel } from "@/lib/format";
import type {
  FinancialEntry,
  MotorcycleFine,
  MotorcycleTrip,
  ServiceMotorcycle,
  ServiceMotorcycleStatus,
} from "@/lib/types";

type HttpMethod = "POST" | "PUT";
type MotorcycleTab = "list" | "new" | "trip";
type SortDirection = "asc" | "desc";
type MotorcycleSortKey =
  | "model"
  | "plate"
  | "driver"
  | "status"
  | "mileage"
  | "departure"
  | "return"
  | "fine";
type MotorcycleSort = { key: MotorcycleSortKey; direction: SortDirection };

const MOTORCYCLE_PAGE_SIZE = 8;

const motorcycleTabs: Array<{ id: MotorcycleTab; label: string; icon: React.ElementType }> = [
  { id: "list", label: "Motos cadastradas", icon: Bike },
  { id: "new", label: "Nova moto", icon: PlusCircle },
  { id: "trip", label: "Saida e retorno", icon: MapPin },
];

function inputClass() {
  return "h-10 w-full min-w-0 px-3 text-sm transition";
}

function textareaClass() {
  return "min-h-20 w-full min-w-0 resize-y px-3 py-2 text-sm transition";
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function PanelTitle({
  meta,
  icon: Icon,
  title,
}: {
  meta?: string;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-teal-300/20 bg-teal-300/10 text-teal-200">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <h2 className="break-words text-base font-semibold text-white">{title}</h2>
        {meta ? <p className="mt-0.5 text-xs text-zinc-500">{meta}</p> : null}
      </div>
    </div>
  );
}

function SubmitButton({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <button
      className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-[8px] bg-teal-300 px-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-teal-950/20 transition hover:-translate-y-0.5 hover:bg-teal-200 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60"
      disabled={loading}
      type="submit"
    >
      <Save size={16} />
      <span className="truncate">{loading ? "Salvando..." : children}</span>
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="h-10 rounded-[8px] border border-white/10 px-4 text-sm font-medium text-zinc-200 transition hover:bg-white/7"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ErrorMessage({ error }: { error: string }) {
  if (!error) return null;
  return (
    <p className="rounded-[8px] border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
      {error}
    </p>
  );
}

function SuccessMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-2 rounded-[8px] border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
      <CheckCircle2 size={16} />
      {message}
    </p>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

function IconButton({
  children,
  icon: Icon,
  onClick,
  tone = "neutral",
}: {
  children: React.ReactNode;
  icon: React.ElementType;
  onClick: () => void;
  tone?: "neutral" | "teal";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-medium transition hover:-translate-y-0.5",
        tone === "teal"
          ? "border-teal-300/25 bg-teal-300/10 text-teal-100 hover:bg-teal-300/15"
          : "border-white/10 text-zinc-200 hover:bg-white/7",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon size={14} />
      {children}
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="app-surface group min-w-0 rounded-[8px] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-teal-300/25">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm leading-5 text-zinc-400">{label}</p>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-white/[0.04] text-teal-200">
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-2 break-words text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SortButton({
  activeSort,
  column,
  label,
  onSort,
}: {
  activeSort: MotorcycleSort;
  column: MotorcycleSortKey;
  label: string;
  onSort: (column: MotorcycleSortKey) => void;
}) {
  const active = activeSort.key === column;

  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 text-left text-xs font-medium uppercase tracking-[0.12em] transition hover:text-zinc-200",
        active ? "text-teal-200" : "text-zinc-500",
      )}
      onClick={() => onSort(column)}
      type="button"
    >
      {label}
      <ArrowDownUp size={13} className={active ? "opacity-100" : "opacity-45"} />
    </button>
  );
}

function InternalNav({
  activeTab,
  onChange,
}: {
  activeTab: MotorcycleTab;
  onChange: (tab: MotorcycleTab) => void;
}) {
  return (
    <>
      <div className="lg:hidden">
        <Field label="Modulo">
          <select className={inputClass()} value={activeTab} onChange={(event) => onChange(event.target.value as MotorcycleTab)}>
            {motorcycleTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <nav className="hidden min-w-0 rounded-[8px] border border-white/10 bg-white/[0.025] p-2 lg:block">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Motos de servico
        </p>
        <div className="grid gap-1">
          {motorcycleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                className={cn(
                  "flex h-11 min-w-0 items-center gap-3 rounded-[8px] px-3 text-left text-sm font-medium transition",
                  active
                    ? "bg-teal-300 text-zinc-950 shadow-lg shadow-teal-950/20"
                    : "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
                )}
                key={tab.id}
                onClick={() => onChange(tab.id)}
                type="button"
              >
                <Icon size={16} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function toLocalTime(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function parseDateTime(dateValue: string, timeValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  const valid =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day &&
    parsed.getHours() === hour &&
    parsed.getMinutes() === minute;

  return valid ? parsed : null;
}

function buildIsoLocal(dateValue: string, timeValue: string) {
  return `${dateValue}T${timeValue}`;
}

function formatPlate(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

async function submitJson<T>(
  method: HttpMethod,
  url: string,
  payload: unknown,
  onDone: (saved: T) => void,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
) {
  setLoading(true);
  setError("");

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.message ?? "Nao foi possivel salvar.");
      return;
    }

    onDone(body as T);
  } catch {
    setError("Nao foi possivel conectar ao servidor.");
  } finally {
    setLoading(false);
  }
}

function upsertSavedItem<T extends { id: string }>(items: T[], saved: T) {
  return items.some((item) => item.id === saved.id)
    ? items.map((item) => (item.id === saved.id ? saved : item))
    : [saved, ...items];
}

function resetMotorcycleForm(now = new Date()) {
  return {
    model: "",
    brand: "",
    plate: "",
    year: now.getFullYear(),
    mileage: 0,
    status: "GARAGE" as ServiceMotorcycleStatus,
    driver: "",
    photoUrl: "",
    notes: "",
  };
}

function resetTripForm(motorcycles: ServiceMotorcycle[], now = new Date()) {
  const firstMotorcycle =
    motorcycles.find((motorcycle) => motorcycle.status === "GARAGE") ?? motorcycles[0];

  return {
    motorcycleId: firstMotorcycle?.id ?? "",
    departureDate: toLocalDate(now),
    departureTime: toLocalTime(now),
    returnDate: "",
    returnTime: "",
    driver: firstMotorcycle?.driver ?? "",
    destination: "",
    serviceDone: "",
    quantityTransported: 0,
    notes: "",
    hasFine: false,
    fineValue: 0,
    fineReason: "",
    fineDate: toLocalDate(now),
    fineNotes: "",
  };
}

function averageServiceHours(trips: MotorcycleTrip[]) {
  const completed = trips.filter((trip) => trip.returnAt);
  if (!completed.length) return 0;
  const total = completed.reduce((sum, trip) => {
    const start = new Date(trip.departureAt).getTime();
    const end = new Date(trip.returnAt!).getTime();
    return sum + Math.max(0, end - start) / 36e5;
  }, 0);
  return Number((total / completed.length).toFixed(1));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function validateMotorcycleForm(form: ReturnType<typeof resetMotorcycleForm>, now: Date) {
  if (form.brand.trim().length < 2) return "Informe a marca da moto.";
  if (form.model.trim().length < 2) return "Informe o modelo da moto.";
  if (form.plate.replace(/[^A-Z0-9]/gi, "").length !== 7) return "Informe uma placa valida.";
  if (!form.driver.trim()) return "Informe o motorista responsavel.";
  if (form.year < 1980 || form.year > now.getFullYear()) return `Informe um ano entre 1980 e ${now.getFullYear()}.`;
  if (form.mileage < 0) return "A quilometragem nao pode ser negativa.";
  return "";
}

function validateTripForm(form: ReturnType<typeof resetTripForm>, now: Date) {
  const departure = parseDateTime(form.departureDate, form.departureTime);
  if (!departure) return "Informe data e horario de saida validos.";
  if (departure.getTime() > now.getTime()) return "A saida nao pode estar no futuro.";
  if (!form.motorcycleId) return "Selecione uma moto.";
  if (form.driver.trim().length < 2) return "Informe o motorista.";
  if (form.destination.trim().length < 2) return "Informe o destino.";
  if (form.serviceDone.trim().length < 2) return "Informe o servico realizado.";

  if (form.returnDate || form.returnTime) {
    if (!form.returnDate || !form.returnTime) return "Informe data e horario de retorno.";
    const returnAt = parseDateTime(form.returnDate, form.returnTime);
    if (!returnAt) return "Informe data e horario de retorno validos.";
    if (returnAt.getTime() > now.getTime()) return "O retorno nao pode estar no futuro.";
    if (returnAt.getTime() < departure.getTime()) return "O retorno nao pode ser antes da saida.";
  }

  if (form.hasFine) {
    if (!form.fineReason || form.fineReason.length < 2) return "Informe o motivo da multa.";
    if (!form.fineDate || new Date(`${form.fineDate}T00:00`).getTime() > now.getTime()) {
      return "Informe uma data de multa valida e sem futuro.";
    }
    if (!form.fineValue || form.fineValue <= 0) return "Informe o valor da multa.";
  }

  return "";
}

function compareValues(first: string | number, second: string | number, direction: SortDirection) {
  const result =
    typeof first === "number" && typeof second === "number"
      ? first - second
      : String(first).localeCompare(String(second), "pt-BR");

  return direction === "asc" ? result : -result;
}

function latestTripFor(motorcycleId: string, trips: MotorcycleTrip[]) {
  return trips
    .filter((trip) => trip.motorcycleId === motorcycleId)
    .sort((first, second) => new Date(second.departureAt).getTime() - new Date(first.departureAt).getTime())[0];
}

function latestFineFor(motorcycleId: string, fines: MotorcycleFine[]) {
  return fines
    .filter((fine) => fine.motorcycleId === motorcycleId)
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())[0];
}

function fineStatusLabel(status: MotorcycleFine["paymentStatus"]) {
  const labels: Record<MotorcycleFine["paymentStatus"], string> = {
    PENDING: "Pendente",
    PARTIAL: "Parcialmente paga",
    PAID: "Paga",
  };

  return labels[status];
}

function fineStatusClass(status: MotorcycleFine["paymentStatus"]) {
  const classes: Record<MotorcycleFine["paymentStatus"], string> = {
    PENDING: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    PARTIAL: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    PAID: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  };

  return classes[status];
}

function compareMotorcycles(
  first: ServiceMotorcycle,
  second: ServiceMotorcycle,
  sort: MotorcycleSort,
  trips: MotorcycleTrip[],
  fines: MotorcycleFine[],
) {
  const getValue = (motorcycle: ServiceMotorcycle): string | number => {
    const trip = latestTripFor(motorcycle.id, trips);
    const fine = latestFineFor(motorcycle.id, fines);
    switch (sort.key) {
      case "model":
        return `${motorcycle.brand} ${motorcycle.model}`;
      case "plate":
        return motorcycle.plate;
      case "driver":
        return motorcycle.driver;
      case "status":
        return motorcycleStatusLabel(motorcycle.status);
      case "mileage":
        return motorcycle.mileage;
      case "departure":
        return trip ? new Date(trip.departureAt).getTime() : 0;
      case "return":
        return trip?.returnAt ? new Date(trip.returnAt).getTime() : 0;
      case "fine":
        return fine ? fine.value : 0;
      default:
        return motorcycle.plate;
    }
  };

  return compareValues(getValue(first), getValue(second), sort.direction);
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

function HistoryModal({
  onClose,
  trips,
  motorcycle,
}: {
  onClose: () => void;
  trips: MotorcycleTrip[];
  motorcycle: ServiceMotorcycle;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="app-surface max-h-[82vh] w-full max-w-4xl overflow-hidden rounded-[8px]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 p-4">
          <PanelTitle icon={History} meta={`${trips.length} saidas registradas`} title={`${motorcycle.brand} ${motorcycle.model}`} />
          <button
            className="grid h-9 w-9 place-items-center rounded-[8px] border border-white/10 text-zinc-300 transition hover:bg-white/7"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-4">
          {trips.length ? (
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 font-medium">Motorista</th>
                  <th className="py-3 pr-4 font-medium">Saida</th>
                  <th className="py-3 pr-4 font-medium">Retorno</th>
                  <th className="py-3 pr-4 font-medium">Destino</th>
                  <th className="py-3 pr-4 font-medium">Servico</th>
                  <th className="py-3 pr-4 font-medium">Multa</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr className="border-b border-white/6 last:border-0" key={trip.id}>
                    <td className="py-3 pr-4 text-zinc-300">{trip.driver}</td>
                    <td className="py-3 pr-4 text-zinc-400">{formatDateTime(trip.departureAt)}</td>
                    <td className="py-3 pr-4 text-zinc-400">{formatDateTime(trip.returnAt)}</td>
                    <td className="py-3 pr-4 text-zinc-300">{trip.destination}</td>
                    <td className="py-3 pr-4 text-zinc-400">{trip.serviceDone}</td>
                    <td className="py-3 pr-4">
                      <Badge className={trip.fine ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}>
                        {trip.fine ? `${currency(trip.fine.value)} - ${fineStatusLabel(trip.fine.paymentStatus)}` : "Nao"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState>Nenhuma saida registrada para esta moto.</EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

function FineDetailsModal({
  fine,
  onClose,
  onSaved,
}: {
  fine: MotorcycleFine;
  onClose: () => void;
  onSaved: (fine: MotorcycleFine) => void;
}) {
  const [form, setForm] = useState(() => ({
    paidAmount: fine.paidAmount,
    paidBy: fine.paidBy ?? "",
    authorizedBy: fine.authorizedBy ?? "",
    paidAt: fine.paidAt ?? new Date().toISOString().slice(0, 10),
    paymentNotes: fine.paymentNotes ?? "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nextStatus = fineStatusLabel(
    form.paidAmount >= fine.value ? "PAID" : form.paidAmount > 0 ? "PARTIAL" : "PENDING",
  );
  const remaining = Math.max(0, fine.value - form.paidAmount);

  async function save() {
    if (form.paidAmount > fine.value) {
      setError("O valor pago nao pode ultrapassar o valor total da multa.");
      return;
    }
    if (form.paidAmount > 0 && (!form.paidBy.trim() || !form.authorizedBy.trim())) {
      setError("Informe quem pagou e quem autorizou o pagamento.");
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch(`/api/service-motorcycles/fines/${fine.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.message ?? "Nao foi possivel atualizar a multa.");
      setLoading(false);
      return;
    }

    onSaved(body as MotorcycleFine);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="app-surface max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[8px]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 p-4">
          <PanelTitle icon={ShieldAlert} meta={`${fine.motorcyclePlate} - ${fine.reason}`} title="Detalhes da multa" />
          <button
            className="grid h-9 w-9 place-items-center rounded-[8px] border border-white/10 text-zinc-300 transition hover:bg-white/7"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid max-h-[75vh] gap-4 overflow-auto p-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard icon={ShieldAlert} label="Valor total" value={currency(fine.value)} />
              <StatCard icon={CreditCard} label="Valor pago" value={currency(form.paidAmount)} />
              <StatCard icon={Gauge} label="Saldo" value={currency(remaining)} />
              <div className="app-surface rounded-[8px] p-4">
                <p className="text-sm text-zinc-400">Status</p>
                <div className="mt-3">
                  <Badge className={fineStatusClass(form.paidAmount >= fine.value ? "PAID" : form.paidAmount > 0 ? "PARTIAL" : "PENDING")}>
                    {nextStatus}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Timeline</h3>
              <div className="mt-4 space-y-3 border-l border-white/10 pl-4">
                <div>
                  <p className="text-sm text-white">Multa registrada</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatDateTime(fine.date)} - {fine.reason}</p>
                </div>
                {fine.paymentHistory.length ? (
                  fine.paymentHistory.map((event) => (
                    <div key={event.id}>
                      <p className="text-sm text-white">{fineStatusLabel(event.paymentStatus)}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {currency(event.paidAmount)} por {event.paidBy || "-"} autorizado por {event.authorizedBy || "-"}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-600">{formatDateTime(event.createdAt)} - {event.changedBy}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">Nenhum pagamento registrado.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Valor pago">
                <input
                  className={inputClass()}
                  max={fine.value}
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.paidAmount}
                  onChange={(event) => {
                    const raw = Number(event.target.value);
                    if (raw > fine.value) {
                      setError("O valor pago nao pode ultrapassar o valor total da multa.");
                    } else {
                      setError("");
                    }
                    setForm((current) => ({ ...current, paidAmount: Math.min(fine.value, Math.max(0, raw)) }));
                  }}
                />
              </Field>
              <Field label="Data do pagamento">
                <input
                  className={inputClass()}
                  type="date"
                  value={form.paidAt}
                  onChange={(event) => setForm((current) => ({ ...current, paidAt: event.target.value }))}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Quem pagou">
                <input className={inputClass()} value={form.paidBy} onChange={(event) => setForm((current) => ({ ...current, paidBy: event.target.value }))} />
              </Field>
              <Field label="Quem autorizou">
                <input className={inputClass()} value={form.authorizedBy} onChange={(event) => setForm((current) => ({ ...current, authorizedBy: event.target.value }))} />
              </Field>
            </div>
            <Field label="Observacoes">
              <textarea className={textareaClass()} value={form.paymentNotes} onChange={(event) => setForm((current) => ({ ...current, paymentNotes: event.target.value }))} />
            </Field>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-400">
              <p>Valor maximo permitido: <strong className="text-white">{currency(fine.value)}</strong></p>
              <p className="mt-1">Status sera atualizado automaticamente conforme o valor pago.</p>
            </div>
            <ErrorMessage error={error} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="flex h-10 items-center justify-center gap-2 rounded-[8px] bg-teal-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60"
                disabled={loading}
                onClick={save}
                type="button"
              >
                <Save size={16} />
                {loading ? "Salvando..." : "Salvar pagamento"}
              </button>
              <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileMotorcycles({
  fines,
  onEdit,
  onFine,
  onHistory,
  onTrip,
  rows,
  trips,
}: {
  fines: MotorcycleFine[];
  onEdit: (motorcycle: ServiceMotorcycle) => void;
  onFine: (fine: MotorcycleFine) => void;
  onHistory: (motorcycle: ServiceMotorcycle) => void;
  onTrip: (motorcycle: ServiceMotorcycle) => void;
  rows: ServiceMotorcycle[];
  trips: MotorcycleTrip[];
}) {
  return (
    <div className="grid gap-3 lg:hidden">
      {rows.map((motorcycle) => {
        const trip = latestTripFor(motorcycle.id, trips);
        const fine = latestFineFor(motorcycle.id, fines);
        return (
          <article className="min-w-0 rounded-[8px] border border-white/10 bg-white/[0.03] p-4" key={motorcycle.id}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-semibold text-white">{motorcycle.brand} {motorcycle.model}</h3>
                <p className="mt-1 text-xs text-zinc-500">{motorcycle.plate} - {motorcycle.driver}</p>
              </div>
              <Badge className={motorcycleStatusClass(motorcycle.status)}>{motorcycleStatusLabel(motorcycle.status)}</Badge>
            </div>
            <div className="mt-4 grid gap-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <span className="text-zinc-500">Km</span>
                <span className="text-right text-zinc-200">{motorcycle.mileage.toLocaleString("pt-BR")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-zinc-500">Saida</span>
                <span className="text-right text-zinc-200">{formatDateTime(trip?.departureAt)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-zinc-500">Retorno</span>
                <span className="text-right text-zinc-200">{formatDateTime(trip?.returnAt)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-zinc-500">Multa</span>
                <span className="text-right text-zinc-200">
                  {fine ? `${currency(fine.value)} - ${fineStatusLabel(fine.paymentStatus)}` : "Nao"}
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <IconButton icon={Edit3} onClick={() => onEdit(motorcycle)}>Editar</IconButton>
              <IconButton icon={MapPin} onClick={() => onTrip(motorcycle)} tone="teal">Registrar saida</IconButton>
              <IconButton icon={History} onClick={() => onHistory(motorcycle)}>Historico</IconButton>
              {fine ? <IconButton icon={Eye} onClick={() => onFine(fine)}>Multa</IconButton> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ServiceMotorcyclesManager({
  entries,
  fines,
  motorcycles,
  trips,
}: {
  entries: FinancialEntry[];
  fines: MotorcycleFine[];
  motorcycles: ServiceMotorcycle[];
  trips: MotorcycleTrip[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MotorcycleTab>("list");
  const [now, setNow] = useState(() => new Date());
  const [motorcycleRows, setMotorcycleRows] = useState(motorcycles);
  const [tripRows, setTripRows] = useState(trips);
  const [fineRows, setFineRows] = useState(fines);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyMotorcycle, setHistoryMotorcycle] = useState<ServiceMotorcycle | null>(null);
  const [selectedFine, setSelectedFine] = useState<MotorcycleFine | null>(null);
  const [motorcycleLoading, setMotorcycleLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [motorcycleError, setMotorcycleError] = useState("");
  const [tripError, setTripError] = useState("");
  const [motorcycleSuccess, setMotorcycleSuccess] = useState("");
  const [tripSuccess, setTripSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fineFilter, setFineFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<MotorcycleSort>({ key: "model", direction: "asc" });
  const [form, setForm] = useState(() => resetMotorcycleForm(now));
  const [tripForm, setTripForm] = useState(() => resetTripForm(motorcycles, now));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const focus = new URLSearchParams(window.location.search).get("focus");
      if (!focus) return;

      const [kind, id] = focus.split(":");
      if (kind === "fine" && id) {
        const fine = fineRows.find((item) => item.id === id);
        if (fine) {
          setSelectedFine(fine);
        }
      }
      if (kind === "motorcycle" && id) {
        const motorcycle = motorcycleRows.find((item) => item.id === id);
        if (motorcycle) {
          setQuery(motorcycle.plate);
        }
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fineRows, motorcycleRows]);

  const today = toLocalDate(now);
  const currentTime = toLocalTime(now);
  const currentYear = now.getFullYear();

  const selectedMotorcycle = useMemo(
    () => motorcycleRows.find((motorcycle) => motorcycle.id === tripForm.motorcycleId),
    [motorcycleRows, tripForm.motorcycleId],
  );
  const averageHours = useMemo(() => averageServiceHours(tripRows), [tripRows]);
  const totalFineValue = useMemo(
    () => fineRows.reduce((total, fine) => total + fine.value, 0),
    [fineRows],
  );
  const operatingCost = useMemo(
    () =>
      entries
        .filter((entry) => entry.kind === "EXPENSE" && entry.serviceMotorcycleName)
        .reduce((total, entry) => total + entry.value, 0),
    [entries],
  );
  const historyTrips = useMemo(
    () =>
      historyMotorcycle
        ? tripRows
            .filter((trip) => trip.motorcycleId === historyMotorcycle.id)
            .sort((first, second) => new Date(second.departureAt).getTime() - new Date(first.departureAt).getTime())
        : [],
    [historyMotorcycle, tripRows],
  );
  const filteredMotorcycles = useMemo(() => {
    const normalized = normalizeText(query);

    return motorcycleRows
      .filter((motorcycle) => {
        const latestFine = latestFineFor(motorcycle.id, fineRows);
        const matchesText =
          !normalized ||
          [motorcycle.model, motorcycle.brand, motorcycle.plate, motorcycle.driver].some((value) =>
            value.toLowerCase().includes(normalized),
          );
        const matchesStatus = statusFilter === "all" || motorcycle.status === statusFilter;
        const matchesFine =
          fineFilter === "all" ||
          (fineFilter === "yes" && Boolean(latestFine)) ||
          (fineFilter === "no" && !latestFine) ||
          (fineFilter === "pending" && latestFine?.paymentStatus === "PENDING") ||
          (fineFilter === "partial" && latestFine?.paymentStatus === "PARTIAL") ||
          (fineFilter === "paid" && latestFine?.paymentStatus === "PAID");
        return matchesText && matchesStatus && matchesFine;
      })
      .sort((first, second) => compareMotorcycles(first, second, sort, tripRows, fineRows));
  }, [fineFilter, fineRows, motorcycleRows, query, sort, statusFilter, tripRows]);
  const totalPages = Math.max(1, Math.ceil(filteredMotorcycles.length / MOTORCYCLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMotorcycles = filteredMotorcycles.slice(
    (currentPage - 1) * MOTORCYCLE_PAGE_SIZE,
    currentPage * MOTORCYCLE_PAGE_SIZE,
  );
  const realtimeTripError = useMemo(() => validateTripForm(tripForm, now), [now, tripForm]);
  const departureTimeMax = tripForm.departureDate === today ? currentTime : undefined;
  const returnTimeMax = tripForm.returnDate === today ? currentTime : undefined;
  const returnTimeMin = tripForm.returnDate && tripForm.returnDate === tripForm.departureDate ? tripForm.departureTime : undefined;

  function changeTab(tab: MotorcycleTab) {
    setActiveTab(tab);
    setMotorcycleError("");
    setTripError("");
    setMotorcycleSuccess("");
    setTripSuccess("");
  }

  function resetMotorcycle() {
    setEditingId(null);
    setForm(resetMotorcycleForm(now));
    setMotorcycleError("");
  }

  function startEdit(motorcycle: ServiceMotorcycle) {
    setEditingId(motorcycle.id);
    setForm({
      model: motorcycle.model,
      brand: motorcycle.brand,
      plate: formatPlate(motorcycle.plate),
      year: motorcycle.year,
      mileage: motorcycle.mileage,
      status: motorcycle.status,
      driver: motorcycle.driver,
      photoUrl: motorcycle.photoUrl ?? "",
      notes: motorcycle.notes ?? "",
    });
    changeTab("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prepareTrip(motorcycle: ServiceMotorcycle) {
    setTripForm((current) => ({
      ...current,
      motorcycleId: motorcycle.id,
      driver: motorcycle.driver,
    }));
    changeTab("trip");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateSort(column: MotorcycleSortKey) {
    setSort((current) => ({
      key: column,
      direction: current.key === column && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function resetPage() {
    setPage(1);
  }

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Bike} label="Motos cadastradas" value={motorcycleRows.length} />
        <StatCard icon={CalendarClock} label="Saidas registradas" value={tripRows.length} />
        <StatCard icon={ShieldAlert} label="Multas" value={fineRows.length} />
        <StatCard icon={Gauge} label="Custos de multas" value={currency(totalFineValue)} />
        <StatCard icon={Clock3} label="Tempo medio em servico" value={`${averageHours}h`} />
      </div>

      <Section className="overflow-hidden p-0">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <PanelTitle icon={Bike} meta={`${currency(operatingCost)} em custos operacionais`} title="Operacao de motos" />
            {activeTab === "list" ? (
              <div className="flex flex-wrap gap-2">
                <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm font-medium text-zinc-200 transition hover:-translate-y-0.5 hover:bg-white/7" href="/api/service-motorcycles/export/pdf">
                  <FileText size={16} />
                  PDF
                </Link>
                <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-teal-300 px-3 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-teal-200" href="/api/service-motorcycles/export/excel">
                  <FileSpreadsheet size={16} />
                  Excel
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <InternalNav activeTab={activeTab} onChange={changeTab} />

          <div className="min-w-0 animate-in fade-in duration-300">
            {activeTab === "list" ? (
              <div className="min-w-0">
                <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <PanelTitle icon={Bike} meta={`${filteredMotorcycles.length} motos encontradas`} title="Motos cadastradas" />
                  <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_170px_150px] xl:w-[760px]">
                    <label className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" size={16} />
                      <input
                        className="h-10 w-full pl-10 pr-3 text-sm"
                        placeholder="Pesquisar moto"
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          resetPage();
                        }}
                      />
                    </label>
                    <label className="relative">
                      <SlidersHorizontal className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" size={16} />
                      <select
                        className="h-10 w-full pl-10 pr-3 text-sm"
                        value={statusFilter}
                        onChange={(event) => {
                          setStatusFilter(event.target.value);
                          resetPage();
                        }}
                      >
                        <option value="all">Todos status</option>
                        <option value="GARAGE">Na garagem</option>
                        <option value="IN_SERVICE">Em servico</option>
                        <option value="MAINTENANCE">Em manutencao</option>
                        <option value="UNAVAILABLE">Indisponivel</option>
                      </select>
                    </label>
                    <select
                      className="h-10 w-full px-3 text-sm"
                      value={fineFilter}
                      onChange={(event) => {
                        setFineFilter(event.target.value);
                        resetPage();
                      }}
                    >
                      <option value="all">Todas multas</option>
                      <option value="yes">Com multa</option>
                      <option value="pending">Pendentes</option>
                      <option value="partial">Parciais</option>
                      <option value="paid">Pagas</option>
                      <option value="no">Sem multa</option>
                    </select>
                  </div>
                </div>

                {paginatedMotorcycles.length ? (
                  <>
                    <MobileMotorcycles
                      fines={fineRows}
                      onEdit={startEdit}
                      onFine={setSelectedFine}
                      onHistory={setHistoryMotorcycle}
                      onTrip={prepareTrip}
                      rows={paginatedMotorcycles}
                      trips={tripRows}
                    />
                    <div className="table-scroll hidden overflow-x-auto lg:block">
                      <table className="w-full min-w-[1160px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="py-3 pr-4"><SortButton activeSort={sort} column="model" label="Modelo" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={sort} column="plate" label="Placa" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={sort} column="driver" label="Motorista" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={sort} column="status" label="Status" onSort={updateSort} /></th>
                            <th className="py-3 pr-4 text-right"><SortButton activeSort={sort} column="mileage" label="Km" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={sort} column="departure" label="Saida" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={sort} column="return" label="Retorno" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={sort} column="fine" label="Multa" onSort={updateSort} /></th>
                            <th className="py-3 pr-4 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Acoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedMotorcycles.map((motorcycle) => {
                            const trip = latestTripFor(motorcycle.id, tripRows);
                            const fine = latestFineFor(motorcycle.id, fineRows);

                            return (
                              <tr className="border-b border-white/6 transition hover:bg-white/[0.025] last:border-0" key={motorcycle.id}>
                                <td className="py-3 pr-4">
                                  <p className="font-medium text-white">{motorcycle.brand} {motorcycle.model}</p>
                                  <p className="mt-1 text-xs text-zinc-500">{motorcycle.notes || "Sem observacoes"}</p>
                                </td>
                                <td className="py-3 pr-4 text-zinc-300">{motorcycle.plate}</td>
                                <td className="py-3 pr-4 text-zinc-400">{motorcycle.driver}</td>
                                <td className="py-3 pr-4">
                                  <Badge className={motorcycleStatusClass(motorcycle.status)}>{motorcycleStatusLabel(motorcycle.status)}</Badge>
                                </td>
                                <td className="py-3 pr-4 text-right font-medium text-white">{motorcycle.mileage.toLocaleString("pt-BR")}</td>
                                <td className="py-3 pr-4 text-zinc-400">{formatDateTime(trip?.departureAt)}</td>
                                <td className="py-3 pr-4 text-zinc-400">{formatDateTime(trip?.returnAt)}</td>
                                <td className="py-3 pr-4">
                                  {fine ? (
                                    <button
                                      className="text-left"
                                      onClick={() => setSelectedFine(fine)}
                                      type="button"
                                    >
                                      <Badge className={fineStatusClass(fine.paymentStatus)}>
                                        {currency(fine.value)} - {fineStatusLabel(fine.paymentStatus)}
                                      </Badge>
                                    </button>
                                  ) : (
                                    <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                                      Nao
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-3 pr-4">
                                  <div className="flex flex-wrap gap-2">
                                    <IconButton icon={Edit3} onClick={() => startEdit(motorcycle)}>Editar</IconButton>
                                    <IconButton icon={MapPin} onClick={() => prepareTrip(motorcycle)} tone="teal">Registrar saida</IconButton>
                                    <IconButton icon={History} onClick={() => setHistoryMotorcycle(motorcycle)}>Historico</IconButton>
                                    {fine ? <IconButton icon={Eye} onClick={() => setSelectedFine(fine)}>Multa</IconButton> : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <EmptyState>Nenhuma moto encontrada.</EmptyState>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-500">
                    Pagina {currentPage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      className="h-9 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((item) => Math.max(1, item - 1))}
                      type="button"
                    >
                      Anterior
                    </button>
                    <button
                      className="h-9 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((item) => Math.min(totalPages, item + 1))}
                      type="button"
                    >
                      Proxima
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "new" ? (
              <div className="mx-auto max-w-4xl">
                <div className="mb-5">
                  <PanelTitle icon={Bike} meta="Cadastro operacional isolado" title={editingId ? "Editar moto" : "Nova moto"} />
                </div>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const validation = validateMotorcycleForm(form, now);
                    if (validation) {
                      setMotorcycleError(validation);
                      setMotorcycleSuccess("");
                      return;
                    }

                    submitJson<ServiceMotorcycle>(
                      editingId ? "PUT" : "POST",
                      editingId ? `/api/service-motorcycles/${editingId}` : "/api/service-motorcycles",
                      form,
                      (saved) => {
                        setMotorcycleRows((items) => upsertSavedItem(items, saved));
                        resetMotorcycle();
                        setMotorcycleSuccess(editingId ? "Moto atualizada com sucesso." : "Moto cadastrada com sucesso.");
                        setActiveTab("list");
                        router.refresh();
                      },
                      setMotorcycleLoading,
                      setMotorcycleError,
                    );
                  }}
                >
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Marca">
                      <input className={inputClass()} required value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} />
                    </Field>
                    <Field label="Modelo">
                      <input className={inputClass()} required value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                    <Field label="Placa">
                      <input
                        className={inputClass()}
                        inputMode="text"
                        pattern="[A-Z]{3}-[A-Z0-9]{4}"
                        placeholder="ABC-1D23"
                        required
                        value={form.plate}
                        onChange={(event) => setForm((current) => ({ ...current, plate: formatPlate(event.target.value) }))}
                      />
                    </Field>
                    <Field label="Ano">
                      <input className={inputClass()} max={currentYear} min={1980} type="number" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: Number(event.target.value) }))} />
                    </Field>
                    <Field label="Quilometragem">
                      <input className={inputClass()} min={0} type="number" value={form.mileage} onChange={(event) => setForm((current) => ({ ...current, mileage: Number(event.target.value) }))} />
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Motorista">
                      <input className={inputClass()} required value={form.driver} onChange={(event) => setForm((current) => ({ ...current, driver: event.target.value }))} />
                    </Field>
                    <Field label="Status">
                      <select className={inputClass()} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ServiceMotorcycleStatus }))}>
                        <option value="GARAGE">Na garagem</option>
                        <option value="IN_SERVICE">Em servico</option>
                        <option value="MAINTENANCE">Em manutencao</option>
                        <option value="UNAVAILABLE">Indisponivel</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                    <div
                      aria-label="Preview da moto"
                      className="grid aspect-square place-items-center overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.035] bg-cover bg-center"
                      role={form.photoUrl ? "img" : undefined}
                      style={form.photoUrl ? { backgroundImage: `url(${form.photoUrl})` } : undefined}
                    >
                      {form.photoUrl ? <span className="sr-only">Preview da moto</span> : <ImageIcon className="text-zinc-600" size={28} />}
                    </div>
                    <div className="space-y-3">
                      <Field label="Foto da moto">
                        <input className={inputClass()} placeholder="URL da imagem" value={form.photoUrl} onChange={(event) => setForm((current) => ({ ...current, photoUrl: event.target.value }))} />
                      </Field>
                      <Field label="Observacoes">
                        <textarea className={textareaClass()} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                      </Field>
                    </div>
                  </div>
                  <ErrorMessage error={motorcycleError} />
                  <SuccessMessage message={motorcycleSuccess} />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <SubmitButton loading={motorcycleLoading}>{editingId ? "Salvar alteracoes" : "Cadastrar moto"}</SubmitButton>
                    <SecondaryButton
                      onClick={() => {
                        resetMotorcycle();
                        changeTab("list");
                      }}
                    >
                      Cancelar
                    </SecondaryButton>
                  </div>
                </form>
              </div>
            ) : null}

            {activeTab === "trip" ? (
              <div className="mx-auto max-w-4xl">
                <div className="mb-5">
                  <PanelTitle icon={MapPin} meta="Data e hora com limite ate o momento atual" title="Saida e retorno" />
                </div>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const validation = validateTripForm(tripForm, now);
                    if (validation) {
                      setTripError(validation);
                      setTripSuccess("");
                      return;
                    }

                    const returnAt = tripForm.returnDate && tripForm.returnTime
                      ? buildIsoLocal(tripForm.returnDate, tripForm.returnTime)
                      : "";

                    submitJson<MotorcycleTrip>(
                      "POST",
                      "/api/service-motorcycles/trips",
                      {
                        motorcycleId: tripForm.motorcycleId,
                        departureAt: buildIsoLocal(tripForm.departureDate, tripForm.departureTime),
                        returnAt,
                        driver: tripForm.driver,
                        destination: tripForm.destination,
                        serviceDone: tripForm.serviceDone,
                        quantityTransported: tripForm.quantityTransported,
                        notes: tripForm.notes,
                        hasFine: tripForm.hasFine,
                        fineValue: tripForm.fineValue,
                        fineReason: tripForm.fineReason,
                        fineDate: tripForm.fineDate,
                        fineNotes: tripForm.fineNotes,
                      },
                      (saved) => {
                        setTripRows((items) => [saved, ...items]);
                        if (saved.fine) setFineRows((items) => [saved.fine!, ...items]);
                        setMotorcycleRows((items) =>
                          items.map((motorcycle) =>
                            motorcycle.id === saved.motorcycleId
                              ? {
                                  ...motorcycle,
                                  driver: saved.driver,
                                  status: saved.returnAt ? "GARAGE" : "IN_SERVICE",
                                }
                              : motorcycle,
                          ),
                        );
                        setTripForm(resetTripForm(motorcycleRows, now));
                        setTripSuccess("Saida registrada com sucesso.");
                        setActiveTab("list");
                        router.refresh();
                      },
                      setTripLoading,
                      setTripError,
                    );
                  }}
                >
                  <Field label="Moto">
                    <select
                      className={inputClass()}
                      required
                      value={tripForm.motorcycleId}
                      onChange={(event) => {
                        const motorcycle = motorcycleRows.find((item) => item.id === event.target.value);
                        setTripForm((current) => ({
                          ...current,
                          motorcycleId: event.target.value,
                          driver: motorcycle?.driver ?? current.driver,
                        }));
                      }}
                    >
                      {motorcycleRows.map((motorcycle) => (
                        <option key={motorcycle.id} value={motorcycle.id}>
                          {motorcycle.brand} {motorcycle.model} - {motorcycle.plate}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {selectedMotorcycle ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-white/10 bg-white/[0.03] px-3 py-2">
                      <span className="text-sm text-zinc-400">{selectedMotorcycle.driver}</span>
                      <Badge className={motorcycleStatusClass(selectedMotorcycle.status)}>
                        {motorcycleStatusLabel(selectedMotorcycle.status)}
                      </Badge>
                    </div>
                  ) : null}
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Data de saida">
                      <input className={inputClass()} max={today} required type="date" value={tripForm.departureDate} onChange={(event) => setTripForm((current) => ({ ...current, departureDate: event.target.value }))} />
                    </Field>
                    <Field label="Hora de saida">
                      <input className={inputClass()} max={departureTimeMax} required step={60} type="time" value={tripForm.departureTime} onChange={(event) => setTripForm((current) => ({ ...current, departureTime: event.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Data de retorno">
                      <input className={inputClass()} max={today} min={tripForm.departureDate || undefined} type="date" value={tripForm.returnDate} onChange={(event) => setTripForm((current) => ({ ...current, returnDate: event.target.value }))} />
                    </Field>
                    <Field label="Hora de retorno">
                      <input className={inputClass()} max={returnTimeMax} min={returnTimeMin} step={60} type="time" value={tripForm.returnTime} onChange={(event) => setTripForm((current) => ({ ...current, returnTime: event.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Motorista">
                      <input className={inputClass()} required value={tripForm.driver} onChange={(event) => setTripForm((current) => ({ ...current, driver: event.target.value }))} />
                    </Field>
                    <Field label="Quantidade">
                      <input className={inputClass()} min={0} type="number" value={tripForm.quantityTransported} onChange={(event) => setTripForm((current) => ({ ...current, quantityTransported: Number(event.target.value) }))} />
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Destino">
                      <input className={inputClass()} required value={tripForm.destination} onChange={(event) => setTripForm((current) => ({ ...current, destination: event.target.value }))} />
                    </Field>
                    <Field label="Servico realizado">
                      <input className={inputClass()} required value={tripForm.serviceDone} onChange={(event) => setTripForm((current) => ({ ...current, serviceDone: event.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <Field label="Levou multa">
                      <div className="grid h-10 grid-cols-2 rounded-[8px] border border-white/10 bg-white/[0.03] p-1">
                        <button
                          className={cn("rounded-[6px] text-sm font-medium transition", !tripForm.hasFine ? "bg-emerald-400/15 text-emerald-100" : "text-zinc-400 hover:text-white")}
                          onClick={() => setTripForm((current) => ({ ...current, hasFine: false }))}
                          type="button"
                        >
                          Nao
                        </button>
                        <button
                          className={cn("rounded-[6px] text-sm font-medium transition", tripForm.hasFine ? "bg-rose-400/15 text-rose-100" : "text-zinc-400 hover:text-white")}
                          onClick={() => setTripForm((current) => ({ ...current, hasFine: true }))}
                          type="button"
                        >
                          Sim
                        </button>
                      </div>
                    </Field>
                    <Field label="Observacoes">
                      <input className={inputClass()} value={tripForm.notes} onChange={(event) => setTripForm((current) => ({ ...current, notes: event.target.value }))} />
                    </Field>
                  </div>
                  <div className={cn("grid transition-all duration-300", tripForm.hasFine ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="grid gap-3 rounded-[8px] border border-rose-400/20 bg-rose-400/8 p-3 sm:grid-cols-2">
                        <Field label="Valor da multa">
                          <input className={inputClass()} min={0} step="0.01" type="number" value={tripForm.fineValue} onChange={(event) => setTripForm((current) => ({ ...current, fineValue: Number(event.target.value) }))} />
                        </Field>
                        <Field label="Data">
                          <input className={inputClass()} max={today} type="date" value={tripForm.fineDate} onChange={(event) => setTripForm((current) => ({ ...current, fineDate: event.target.value }))} />
                        </Field>
                        <Field label="Motivo">
                          <input className={inputClass()} value={tripForm.fineReason} onChange={(event) => setTripForm((current) => ({ ...current, fineReason: event.target.value }))} />
                        </Field>
                        <Field label="Observacao">
                          <input className={inputClass()} value={tripForm.fineNotes} onChange={(event) => setTripForm((current) => ({ ...current, fineNotes: event.target.value }))} />
                        </Field>
                      </div>
                    </div>
                  </div>
                  <p className={cn("text-sm", realtimeTripError ? "text-amber-200" : "text-emerald-200")}>
                    {realtimeTripError || "Datas e horarios validos."}
                  </p>
                  <ErrorMessage error={tripError} />
                  <SuccessMessage message={tripSuccess} />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <SubmitButton loading={tripLoading}>Registrar saida</SubmitButton>
                    <SecondaryButton onClick={() => changeTab("list")}>Cancelar</SecondaryButton>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      {historyMotorcycle ? (
        <HistoryModal motorcycle={historyMotorcycle} onClose={() => setHistoryMotorcycle(null)} trips={historyTrips} />
      ) : null}

      {selectedFine ? (
        <FineDetailsModal
          fine={selectedFine}
          onClose={() => setSelectedFine(null)}
          onSaved={(saved) => {
            setFineRows((items) => items.map((item) => (item.id === saved.id ? saved : item)));
            setTripRows((items) =>
              items.map((trip) => (trip.fine?.id === saved.id ? { ...trip, fine: saved } : trip)),
            );
            setSelectedFine(saved);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
