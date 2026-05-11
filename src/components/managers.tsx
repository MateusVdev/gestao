"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDollarSign,
  Droplets,
  Edit3,
  Fuel,
  PackagePlus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Truck,
  UserPlus,
  Wrench,
} from "lucide-react";
import { FinanceCharts } from "@/components/charts";
import { Section } from "@/components/page";
import { buildMonthlyFinancial, buildVehicleExpenses } from "@/lib/analytics";
import { currency, date, statusClass, statusLabel, stockRisk } from "@/lib/format";
import type {
  FinancialEntry,
  FinancialKind,
  FuelLog,
  MaintenanceRecord,
  OilChange,
  PartStock,
  Supplier,
  Vehicle,
  VehicleStatus,
} from "@/lib/types";

type HttpMethod = "POST" | "PUT";
type MobileLine = { label: string; value: React.ReactNode };

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

function inputClass() {
  return "h-11 w-full min-w-0 px-3 text-sm";
}

function textareaClass() {
  return "min-h-24 w-full min-w-0 resize-y px-3 py-2 text-sm";
}

function SubmitButton({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading: boolean;
}) {
  return (
    <button
      className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-[8px] bg-teal-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
      type="submit"
    >
      <Save size={17} />
      <span className="truncate">{loading ? "Salvando..." : children}</span>
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-[8px] border border-white/10 px-4 text-sm font-medium text-zinc-200 transition hover:bg-white/7"
      onClick={onClick}
      type="button"
    >
      <RotateCcw size={16} />
      <span className="truncate">{children}</span>
    </button>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-white/10 px-3 text-xs font-medium text-zinc-200 transition hover:bg-white/7 hover:text-white"
      onClick={onClick}
      type="button"
    >
      <Edit3 size={14} />
      Editar
    </button>
  );
}

function PanelTitle({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="mb-5 flex min-w-0 items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-teal-300/12 text-teal-200">
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function upsertSavedItem<T extends { id: string }>(items: T[], saved: T) {
  const exists = items.some((item) => item.id === saved.id);

  if (!exists) {
    return [saved, ...items];
  }

  return items.map((item) => (item.id === saved.id ? saved : item));
}

function useEditableRecords<T>(records: T[]) {
  const [items, setItems] = useState(records);

  return [items, setItems] as const;
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
      setError(body?.message ?? "Não foi possível salvar.");
      return;
    }

    onDone(body as T);
  } catch {
    setError("Não foi possível conectar ao servidor.");
  } finally {
    setLoading(false);
  }
}

function ErrorMessage({ error }: { error: string }) {
  if (!error) {
    return null;
  }

  return (
    <p className="rounded-[8px] border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
      {error}
    </p>
  );
}

function nodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(nodeText).join(" ");
  }

  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return nodeText(props?.children);
  }

  return "";
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortIndex, setSortIndex] = useState(0);
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [visible, setVisible] = useState(() => new Set(columns));
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows
      .filter((row) => !normalized || row.map(nodeText).join(" ").toLowerCase().includes(normalized))
      .toSorted((first, second) => {
        const result = nodeText(first[sortIndex]).localeCompare(nodeText(second[sortIndex]), "pt-BR", {
          numeric: true,
        });
        return direction === "asc" ? result : -result;
      });
  }, [direction, query, rows, sortIndex]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleIndexes = columns
    .map((column, index) => ({ column, index }))
    .filter((item) => visible.has(item.column));

  function updateSort(index: number) {
    setSortIndex((current) => {
      if (current === index) {
        setDirection((value) => (value === "asc" ? "desc" : "asc"));
        return current;
      }
      setDirection("asc");
      return index;
    });
  }

  return (
    <div className="hidden md:block">
      <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <input
          className="h-10 w-full max-w-md px-3 text-sm"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Pesquisar na tabela"
          value={query}
        />
        <div className="flex flex-wrap gap-2">
          {columns.map((column) => (
            <label className="inline-flex h-8 items-center gap-2 rounded-[8px] border border-white/10 px-2 text-xs text-zinc-300" key={column}>
              <input
                checked={visible.has(column)}
                onChange={() =>
                  setVisible((current) => {
                    const next = new Set(current);
                    if (next.has(column) && next.size > 1) {
                      next.delete(column);
                    } else {
                      next.add(column);
                    }
                    return next;
                  })
                }
                type="checkbox"
              />
              {column}
            </label>
          ))}
        </div>
      </div>
      <div className="table-scroll overflow-x-auto rounded-[8px] border border-white/10 bg-white/[0.02]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
            <tr className="border-b border-white/10">
              {visibleIndexes.map(({ column, index }) => (
                <th className="resize-x overflow-auto py-3 pr-4 font-medium" key={column}>
                  <button
                    className="inline-flex items-center gap-1 transition hover:text-white"
                    onClick={() => updateSort(index)}
                    type="button"
                  >
                    {column}
                    {sortIndex === index ? (direction === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rowIndex) => (
              <tr className="border-b border-white/6 transition hover:bg-white/[0.025] last:border-0" key={rowIndex}>
                {visibleIndexes.map(({ index }) => (
                  <td className="py-3 pr-4 align-top text-zinc-400" key={`${rowIndex}-${index}`}>
                    {row[index]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm text-zinc-500">
        <span>
          Pagina {currentPage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            className="h-8 rounded-[8px] border border-white/10 px-3 text-xs text-zinc-200 disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Anterior
          </button>
          <button
            className="h-8 rounded-[8px] border border-white/10 px-3 text-xs text-zinc-200 disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            type="button"
          >
            Proxima
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileRecords({
  records,
}: {
  records: Array<{
    id: string;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    lines: MobileLine[];
    action?: React.ReactNode;
  }>;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {records.map((record) => (
        <article
          className="min-w-0 rounded-[8px] border border-white/10 bg-white/[0.03] p-4"
          key={record.id}
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-sm font-semibold text-white">{record.title}</h3>
              {record.subtitle ? (
                <p className="mt-1 break-words text-xs leading-5 text-zinc-500">
                  {record.subtitle}
                </p>
              ) : null}
            </div>
            {record.action}
          </div>
          <div className="mt-4 grid gap-2">
            {record.lines.map((line) => (
              <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 text-xs" key={line.label}>
                <span className="text-zinc-500">{line.label}</span>
                <span className="min-w-0 break-words text-right text-zinc-200">{line.value}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function ManagementGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">{children}</div>;
}

function resetVehicleForm() {
  return {
    name: "",
    model: "",
    plate: "",
    year: new Date().getFullYear(),
    driver: "",
    entryDate: new Date().toISOString().slice(0, 10),
    exitDate: "",
    status: "ACTIVE" as VehicleStatus,
    mileage: 0,
  };
}

function toVehicleForm(vehicle: Vehicle) {
  return {
    name: vehicle.name,
    model: vehicle.model,
    plate: vehicle.plate,
    year: vehicle.year,
    driver: vehicle.driver,
    entryDate: vehicle.entryDate,
    exitDate: vehicle.exitDate ?? "",
    status: vehicle.status,
    mileage: vehicle.mileage,
  };
}

export function VehicleManager({ vehicles }: { vehicles: Vehicle[] }) {
  const router = useRouter();
  const [vehicleRows, setVehicleRows] = useEditableRecords(vehicles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(resetVehicleForm);

  function update(name: keyof ReturnType<typeof resetVehicleForm>, value: string | number) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function reset() {
    setEditingId(null);
    setForm(resetVehicleForm());
    setError("");
  }

  function startEdit(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setForm(toVehicleForm(vehicle));
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateStatus(status: VehicleStatus) {
    setForm((current) => ({
      ...current,
      status,
      exitDate:
        status === "INACTIVE"
          ? current.exitDate || new Date().toISOString().slice(0, 10)
          : "",
    }));
  }

  return (
    <ManagementGrid>
      <Section>
        <PanelTitle
          description="Inclua ou edite veículos, motoristas responsáveis e situação operacional."
          icon={Truck}
          title={editingId ? "Editar veículo" : "Novo veículo"}
        />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitJson<Vehicle>(
              editingId ? "PUT" : "POST",
              editingId ? `/api/vehicles/${editingId}` : "/api/vehicles",
              form,
              (saved) => {
                setVehicleRows((items) => upsertSavedItem(items, saved));
                reset();
                router.refresh();
              },
              setLoading,
              setError,
            );
          }}
        >
          <Field label="Nome do veículo">
            <input className={inputClass()} required value={form.name} onChange={(event) => update("name", event.target.value)} />
          </Field>
          <Field label="Modelo">
            <input className={inputClass()} required value={form.model} onChange={(event) => update("model", event.target.value)} />
          </Field>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Placa">
              <input className={inputClass()} required value={form.plate} onChange={(event) => update("plate", event.target.value)} />
            </Field>
            <Field label="Ano">
              <input className={inputClass()} min={1980} required type="number" value={form.year} onChange={(event) => update("year", Number(event.target.value))} />
            </Field>
          </div>
          <Field label="Motorista responsável">
            <input className={inputClass()} required value={form.driver} onChange={(event) => update("driver", event.target.value)} />
          </Field>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Data de entrada">
              <input className={inputClass()} required type="date" value={form.entryDate} onChange={(event) => update("entryDate", event.target.value)} />
            </Field>
            <Field label="Quilometragem">
              <input className={inputClass()} min={0} required type="number" value={form.mileage} onChange={(event) => update("mileage", Number(event.target.value))} />
            </Field>
          </div>
          <Field label="Status">
            <select className={inputClass()} value={form.status} onChange={(event) => updateStatus(event.target.value as VehicleStatus)}>
              <option value="ACTIVE">Ativo</option>
              <option value="MAINTENANCE">Em manutenção</option>
              <option value="INACTIVE">Inativo</option>
              <option value="ALERT">Atenção</option>
            </select>
          </Field>
          {form.status === "INACTIVE" ? (
            <Field label="Data de saída">
              <input className={inputClass()} type="date" value={form.exitDate} onChange={(event) => update("exitDate", event.target.value)} />
            </Field>
          ) : null}
          <ErrorMessage error={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton loading={loading}>{editingId ? "Salvar alterações" : "Cadastrar veículo"}</SubmitButton>
            {editingId ? <SecondaryButton onClick={reset}>Cancelar edição</SecondaryButton> : null}
          </div>
        </form>
      </Section>

      <Section>
        <PanelTitle
          description="Frota cadastrada com edição rápida de placa, motorista, status e quilometragem."
          icon={Truck}
          title="Veículos cadastrados"
        />
        <MobileRecords
          records={vehicleRows.map((vehicle) => ({
            id: vehicle.id,
            title: vehicle.name,
            subtitle: vehicle.model,
            action: <EditButton onClick={() => startEdit(vehicle)} />,
            lines: [
              { label: "Placa", value: vehicle.plate },
              { label: "Ano", value: vehicle.year },
              { label: "Motorista", value: vehicle.driver },
              { label: "Entrada", value: date(vehicle.entryDate) },
              { label: "Saída", value: vehicle.exitDate ? date(vehicle.exitDate) : "-" },
              {
                label: "Status",
                value: (
                  <span className={`rounded-full border px-2 py-1 text-xs ${statusClass(vehicle.status)}`}>
                    {statusLabel(vehicle.status)}
                  </span>
                ),
              },
              { label: "Km", value: vehicle.mileage.toLocaleString("pt-BR") },
            ],
          }))}
        />
        <Table
          columns={["Veículo", "Placa", "Ano", "Motorista", "Entrada", "Saída", "Status", "Km", "Ações"]}
          rows={vehicleRows.map((vehicle) => [
            <div key="vehicle">
              <p className="font-medium text-white">{vehicle.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{vehicle.model}</p>
            </div>,
            vehicle.plate,
            vehicle.year,
            vehicle.driver,
            date(vehicle.entryDate),
            vehicle.exitDate ? date(vehicle.exitDate) : "-",
            <span className={`rounded-full border px-2 py-1 text-xs ${statusClass(vehicle.status)}`} key="status">
              {statusLabel(vehicle.status)}
            </span>,
            <span className="block text-right text-zinc-300" key="km">
              {vehicle.mileage.toLocaleString("pt-BR")}
            </span>,
            <EditButton key="edit" onClick={() => startEdit(vehicle)} />,
          ])}
        />
      </Section>
    </ManagementGrid>
  );
}

function resetMaintenanceForm(vehicles: Vehicle[]) {
  return {
    vehicleId: vehicles[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    type: "Preventiva",
    mechanic: "",
    notes: "",
  };
}

function defaultMaintenancePart(partStock: PartStock[]) {
  return {
    partStockId: partStock[0]?.id ?? "",
    name: partStock[0]?.name ?? "",
    quantity: 1,
    unitValue: partStock[0]?.unitCost ?? 0,
  };
}

export function MaintenanceManager({
  maintenances,
  partStock,
  vehicles,
}: {
  maintenances: MaintenanceRecord[];
  partStock: PartStock[];
  vehicles: Vehicle[];
}) {
  const router = useRouter();
  const [maintenanceRows, setMaintenanceRows] = useEditableRecords(maintenances);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => resetMaintenanceForm(vehicles));
  const [parts, setParts] = useState([defaultMaintenancePart(partStock)]);
  const total = useMemo(
    () => parts.reduce((sum, part) => sum + part.quantity * part.unitValue, 0),
    [parts],
  );
  const stockWarnings = useMemo(
    () =>
      parts
        .map((part) => {
          const stock = partStock.find((item) => item.id === part.partStockId);
          return stock && part.quantity > stock.quantity
            ? `${stock.name}: disponivel ${stock.quantity}, solicitado ${part.quantity}`
            : null;
        })
        .filter(Boolean),
    [partStock, parts],
  );

  function reset() {
    setEditingId(null);
    setForm(resetMaintenanceForm(vehicles));
    setParts([defaultMaintenancePart(partStock)]);
    setError("");
  }

  function startEdit(maintenance: MaintenanceRecord) {
    setEditingId(maintenance.id);
    setForm({
      vehicleId: maintenance.vehicleId,
      date: maintenance.date,
      type: maintenance.type,
      mechanic: maintenance.mechanic,
      notes: maintenance.notes ?? "",
    });
    setParts(
      maintenance.parts.map((part) => ({
        partStockId: part.partStockId ?? "",
        name: part.name,
        quantity: part.quantity,
        unitValue: part.unitValue,
      })),
    );
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updatePart(index: number, value: Partial<(typeof parts)[number]>) {
    setParts((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    );
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
      <Section>
        <PanelTitle
          description="Registre ou edite peças, quantidades, custos, mecânico e observações."
          icon={Wrench}
          title={editingId ? "Editar manutenção" : "Nova manutenção"}
        />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (stockWarnings.length) {
              setError(`Estoque insuficiente: ${stockWarnings.join("; ")}`);
              return;
            }
            submitJson<MaintenanceRecord>(
              editingId ? "PUT" : "POST",
              editingId ? `/api/maintenance/${editingId}` : "/api/maintenance",
              { ...form, parts },
              (saved) => {
                setMaintenanceRows((items) => upsertSavedItem(items, saved));
                reset();
                router.refresh();
              },
              setLoading,
              setError,
            );
          }}
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Veículo">
              <select className={inputClass()} value={form.vehicleId} onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input className={inputClass()} type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </Field>
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <select className={inputClass()} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                <option>Preventiva</option>
                <option>Corretiva</option>
                <option>Pneus</option>
                <option>Elétrica</option>
                <option>Suspensão</option>
              </select>
            </Field>
            <Field label="Mecânico responsável">
              <input className={inputClass()} required value={form.mechanic} onChange={(event) => setForm((current) => ({ ...current, mechanic: event.target.value }))} />
            </Field>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Peças utilizadas</p>
              <button
                className="grid h-9 w-9 place-items-center rounded-[8px] border border-white/10 text-zinc-300 transition hover:bg-white/7 hover:text-white"
                onClick={() => setParts((items) => [...items, defaultMaintenancePart(partStock)])}
                title="Adicionar peça"
                type="button"
              >
                <Plus size={17} />
              </button>
            </div>
            {parts.map((part, index) => (
              <div className="grid min-w-0 gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[minmax(0,1fr)_88px_120px_40px]" key={index}>
                <div className="space-y-3">
                  <Field label="Peça">
                    <select
                      className={inputClass()}
                      value={part.partStockId}
                      onChange={(event) => {
                        const stock = partStock.find((item) => item.id === event.target.value);
                        updatePart(index, {
                          partStockId: event.target.value,
                          name: stock?.name ?? "",
                          unitValue: stock?.unitCost ?? 0,
                        });
                      }}
                    >
                      {partStock.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} ({item.quantity} disp.)</option>
                      ))}
                    </select>
                  </Field>
                  {!part.partStockId ? (
                    <Field label="Nome da peça">
                      <input className={inputClass()} required value={part.name} onChange={(event) => updatePart(index, { name: event.target.value })} />
                    </Field>
                  ) : null}
                </div>
                <Field label="Qtd.">
                  <input className={inputClass()} min={1} type="number" value={part.quantity} onChange={(event) => updatePart(index, { quantity: Number(event.target.value) })} />
                </Field>
                <Field label="Valor unit.">
                  <input className={`${inputClass()} disabled:cursor-not-allowed disabled:opacity-70`} disabled={Boolean(part.partStockId)} min={0} step="0.01" type="number" value={part.unitValue} onChange={(event) => updatePart(index, { unitValue: Number(event.target.value) })} />
                </Field>
                <button
                  className="mt-6 grid h-11 w-10 place-items-center rounded-[8px] border border-white/10 text-zinc-400 transition hover:bg-rose-400/10 hover:text-rose-200"
                  onClick={() => setParts((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                  title="Remover peça"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <Field label="Observações">
            <textarea className={textareaClass()} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </Field>

          {stockWarnings.length ? (
            <div className="rounded-[8px] border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              Estoque insuficiente: {stockWarnings.join("; ")}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4 rounded-[8px] border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-sm text-zinc-400">Valor total</span>
            <strong className="shrink-0 text-white">{currency(total)}</strong>
          </div>
          <ErrorMessage error={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton loading={loading}>{editingId ? "Salvar alterações" : "Registrar manutenção"}</SubmitButton>
            {editingId ? <SecondaryButton onClick={reset}>Cancelar edição</SecondaryButton> : null}
          </div>
        </form>
      </Section>

      <Section>
        <PanelTitle
          description="Histórico completo com edição de peças e custos totais por manutenção."
          icon={Wrench}
          title="Histórico de manutenção"
        />
        <MobileRecords
          records={maintenanceRows.map((maintenance) => ({
            id: maintenance.id,
            title: maintenance.vehicleName,
            subtitle: `${maintenance.type} • ${maintenance.mechanic}`,
            action: <EditButton onClick={() => startEdit(maintenance)} />,
            lines: [
              { label: "Peças", value: maintenance.parts.map((part) => `${part.name} (${part.quantity})`).join(", ") },
              { label: "Data", value: date(maintenance.date) },
              { label: "Total", value: currency(maintenance.totalValue) },
            ],
          }))}
        />
        <Table
          columns={["Veículo", "Tipo", "Peças", "Data", "Mecânico", "Total", "Ações"]}
          rows={maintenanceRows.map((maintenance) => [
            <span className="font-medium text-white" key="vehicle">{maintenance.vehicleName}</span>,
            maintenance.type,
            <span className="break-words" key="parts">{maintenance.parts.map((part) => `${part.name} (${part.quantity})`).join(", ")}</span>,
            date(maintenance.date),
            maintenance.mechanic,
            <span className="block text-right font-medium text-white" key="total">{currency(maintenance.totalValue)}</span>,
            <EditButton key="edit" onClick={() => startEdit(maintenance)} />,
          ])}
        />
      </Section>
    </div>
  );
}

function VehicleDateFields<T extends { vehicleId: string; date: string }>({
  form,
  setForm,
  vehicles,
}: {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  vehicles: Vehicle[];
}) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Field label="Veículo">
        <select className={inputClass()} value={form.vehicleId} onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Data">
        <input className={inputClass()} type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
      </Field>
    </div>
  );
}

function TotalPreview({ value }: { value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-sm text-zinc-400">Valor total</span>
      <strong className="shrink-0 text-white">{currency(value || 0)}</strong>
    </div>
  );
}

function resetOilForm(vehicles: Vehicle[]) {
  return {
    vehicleId: vehicles[0]?.id ?? "",
    oilType: "15W40 Diesel",
    liters: 0,
    valuePerLiter: 0,
    date: new Date().toISOString().slice(0, 10),
  };
}

export function OilManager({ oilChanges, vehicles }: { oilChanges: OilChange[]; vehicles: Vehicle[] }) {
  const router = useRouter();
  const [oilRows, setOilRows] = useEditableRecords(oilChanges);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => resetOilForm(vehicles));

  function reset() {
    setEditingId(null);
    setForm(resetOilForm(vehicles));
    setError("");
  }

  function startEdit(item: OilChange) {
    setEditingId(item.id);
    setForm({
      vehicleId: item.vehicleId,
      oilType: item.oilType,
      liters: item.liters,
      valuePerLiter: item.valuePerLiter,
      date: item.date,
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <ManagementGrid>
      <Section>
        <PanelTitle
          description="Registre ou edite tipo de óleo, litros, valor por litro e data da troca."
          icon={Droplets}
          title={editingId ? "Editar troca de óleo" : "Controle de óleo"}
        />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitJson<OilChange>(
              editingId ? "PUT" : "POST",
              editingId ? `/api/oil/${editingId}` : "/api/oil",
              form,
              (saved) => {
                setOilRows((items) => upsertSavedItem(items, saved));
                reset();
                router.refresh();
              },
              setLoading,
              setError,
            );
          }}
        >
          <VehicleDateFields form={form} setForm={setForm} vehicles={vehicles} />
          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            <Field label="Tipo do óleo">
              <input className={inputClass()} value={form.oilType} onChange={(event) => setForm((current) => ({ ...current, oilType: event.target.value }))} />
            </Field>
            <Field label="Litros">
              <input className={inputClass()} min={0} step="0.01" type="number" value={form.liters} onChange={(event) => setForm((current) => ({ ...current, liters: Number(event.target.value) }))} />
            </Field>
            <Field label="Valor por litro">
              <input className={inputClass()} min={0} step="0.01" type="number" value={form.valuePerLiter} onChange={(event) => setForm((current) => ({ ...current, valuePerLiter: Number(event.target.value) }))} />
            </Field>
          </div>
          <TotalPreview value={form.liters * form.valuePerLiter} />
          <ErrorMessage error={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton loading={loading}>{editingId ? "Salvar alterações" : "Registrar troca"}</SubmitButton>
            {editingId ? <SecondaryButton onClick={reset}>Cancelar edição</SecondaryButton> : null}
          </div>
        </form>
      </Section>

      <Section>
        <PanelTitle description="Histórico persistente para consulta e relatório." icon={Droplets} title="Histórico" />
        <MobileRecords
          records={oilRows.map((item) => ({
            id: item.id,
            title: item.vehicleName,
            subtitle: item.oilType,
            action: <EditButton onClick={() => startEdit(item)} />,
            lines: [
              { label: "Litros", value: `${item.liters} L` },
              { label: "Data", value: date(item.date) },
              { label: "Total", value: currency(item.totalValue) },
            ],
          }))}
        />
        <Table
          columns={["Veículo", "Óleo", "Litros", "Data", "Total", "Ações"]}
          rows={oilRows.map((item) => [
            <span className="font-medium text-white" key="vehicle">{item.vehicleName}</span>,
            item.oilType,
            `${item.liters} L`,
            date(item.date),
            <span className="font-medium text-white" key="total">{currency(item.totalValue)}</span>,
            <EditButton key="edit" onClick={() => startEdit(item)} />,
          ])}
        />
      </Section>
    </ManagementGrid>
  );
}

function resetFuelForm(vehicles: Vehicle[]) {
  return {
    vehicleId: vehicles[0]?.id ?? "",
    fuelType: "Diesel S10",
    liters: 0,
    pricePerLiter: 0,
    station: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

export function FuelManager({ fuelLogs, vehicles }: { fuelLogs: FuelLog[]; vehicles: Vehicle[] }) {
  const router = useRouter();
  const [fuelRows, setFuelRows] = useEditableRecords(fuelLogs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => resetFuelForm(vehicles));

  function reset() {
    setEditingId(null);
    setForm(resetFuelForm(vehicles));
    setError("");
  }

  function startEdit(item: FuelLog) {
    setEditingId(item.id);
    setForm({
      vehicleId: item.vehicleId,
      fuelType: item.fuelType,
      liters: item.liters,
      pricePerLiter: item.pricePerLiter,
      station: item.station,
      date: item.date,
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <ManagementGrid>
      <Section>
        <PanelTitle
          description="Controle ou edite abastecimentos, postos, litros e despesa por veículo."
          icon={Fuel}
          title={editingId ? "Editar abastecimento" : "Controle de combustível"}
        />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitJson<FuelLog>(
              editingId ? "PUT" : "POST",
              editingId ? `/api/fuel/${editingId}` : "/api/fuel",
              form,
              (saved) => {
                setFuelRows((items) => upsertSavedItem(items, saved));
                reset();
                router.refresh();
              },
              setLoading,
              setError,
            );
          }}
        >
          <VehicleDateFields form={form} setForm={setForm} vehicles={vehicles} />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <Field label="Combustível">
              <input className={inputClass()} value={form.fuelType} onChange={(event) => setForm((current) => ({ ...current, fuelType: event.target.value }))} />
            </Field>
            <Field label="Litros">
              <input className={inputClass()} min={0} step="0.01" type="number" value={form.liters} onChange={(event) => setForm((current) => ({ ...current, liters: Number(event.target.value) }))} />
            </Field>
            <Field label="Valor por litro">
              <input className={inputClass()} min={0} step="0.01" type="number" value={form.pricePerLiter} onChange={(event) => setForm((current) => ({ ...current, pricePerLiter: Number(event.target.value) }))} />
            </Field>
            <Field label="Posto">
              <input className={inputClass()} value={form.station} onChange={(event) => setForm((current) => ({ ...current, station: event.target.value }))} />
            </Field>
          </div>
          <TotalPreview value={form.liters * form.pricePerLiter} />
          <ErrorMessage error={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton loading={loading}>{editingId ? "Salvar alterações" : "Registrar abastecimento"}</SubmitButton>
            {editingId ? <SecondaryButton onClick={reset}>Cancelar edição</SecondaryButton> : null}
          </div>
        </form>
      </Section>

      <Section>
        <PanelTitle description="Histórico persistente para consulta e relatório." icon={Fuel} title="Histórico" />
        <MobileRecords
          records={fuelRows.map((item) => ({
            id: item.id,
            title: item.vehicleName,
            subtitle: `${item.fuelType} • ${item.station}`,
            action: <EditButton onClick={() => startEdit(item)} />,
            lines: [
              { label: "Litros", value: `${item.liters} L` },
              { label: "Data", value: date(item.date) },
              { label: "Total", value: currency(item.totalValue) },
            ],
          }))}
        />
        <Table
          columns={["Veículo", "Combustível", "Litros", "Posto", "Data", "Total", "Ações"]}
          rows={fuelRows.map((item) => [
            <span className="font-medium text-white" key="vehicle">{item.vehicleName}</span>,
            item.fuelType,
            `${item.liters} L`,
            item.station,
            date(item.date),
            <span className="font-medium text-white" key="total">{currency(item.totalValue)}</span>,
            <EditButton key="edit" onClick={() => startEdit(item)} />,
          ])}
        />
      </Section>
    </ManagementGrid>
  );
}

function resetFinanceForm() {
  return {
    kind: "INCOME" as FinancialKind,
    category: "Receita operacional",
    description: "",
    value: 0,
    date: new Date().toISOString().slice(0, 10),
    vehicleId: "",
  };
}

export function FinanceManager({
  entries,
  vehicles,
}: {
  entries: FinancialEntry[];
  vehicles: Vehicle[];
}) {
  const router = useRouter();
  const [financeRows, setFinanceRows] = useEditableRecords(entries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(resetFinanceForm);
  const monthlyFinancial = useMemo(() => buildMonthlyFinancial(financeRows), [financeRows]);
  const vehicleExpenses = useMemo(() => buildVehicleExpenses(financeRows), [financeRows]);

  function reset() {
    setEditingId(null);
    setForm(resetFinanceForm());
    setError("");
  }

  function startEdit(entry: FinancialEntry) {
    setEditingId(entry.id);
    setForm({
      kind: entry.kind,
      category: entry.category,
      description: entry.description,
      value: entry.value,
      date: entry.date,
      vehicleId: entry.vehicleId ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <FinanceCharts monthly={monthlyFinancial} vehicleExpenses={vehicleExpenses} />
      <div className="mt-4">
        <ManagementGrid>
      <Section>
        <PanelTitle
          description="Lance ou edite entradas e saídas para recalcular lucro ou prejuízo."
          icon={CircleDollarSign}
          title={editingId ? "Editar lançamento" : "Novo lançamento"}
        />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitJson<FinancialEntry>(
              editingId ? "PUT" : "POST",
              editingId ? `/api/finance/${editingId}` : "/api/finance",
              form,
              (saved) => {
                setFinanceRows((items) => upsertSavedItem(items, saved));
                reset();
                router.refresh();
              },
              setLoading,
              setError,
            );
          }}
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <select className={inputClass()} value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as FinancialKind }))}>
                <option value="INCOME">Entrada</option>
                <option value="EXPENSE">Saída</option>
              </select>
            </Field>
            <Field label="Categoria">
              <input className={inputClass()} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
            </Field>
          </div>
          <Field label="Descrição">
            <input className={inputClass()} required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            <Field label="Valor">
              <input className={inputClass()} min={0} step="0.01" type="number" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: Number(event.target.value) }))} />
            </Field>
            <Field label="Data">
              <input className={inputClass()} type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </Field>
            <Field label="Veículo">
              <select className={inputClass()} value={form.vehicleId} onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}>
                <option value="">Sem veículo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <ErrorMessage error={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton loading={loading}>{editingId ? "Salvar alterações" : "Salvar lançamento"}</SubmitButton>
            {editingId ? <SecondaryButton onClick={reset}>Cancelar edição</SecondaryButton> : null}
          </div>
        </form>
      </Section>

      <Section>
        <PanelTitle
          description="Histórico financeiro editável integrado às manutenções, óleo e combustível."
          icon={CircleDollarSign}
          title="Lançamentos"
        />
        <MobileRecords
          records={financeRows.map((entry) => ({
            id: entry.id,
            title: entry.description,
            subtitle: `${entry.category} • ${entry.kind === "INCOME" ? "Entrada" : "Saída"}`,
            action: <EditButton onClick={() => startEdit(entry)} />,
            lines: [
              { label: "Veículo", value: entry.vehicleName ?? "-" },
              { label: "Data", value: date(entry.date) },
              { label: "Valor", value: currency(entry.value) },
            ],
          }))}
        />
        <Table
          columns={["Tipo", "Categoria", "Descrição", "Veículo", "Data", "Valor", "Ações"]}
          rows={financeRows.map((entry) => [
            <span className={`rounded-full border px-2 py-1 text-xs ${entry.kind === "INCOME" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200"}`} key="kind">
              {entry.kind === "INCOME" ? "Entrada" : "Saída"}
            </span>,
            entry.category,
            entry.description,
            entry.vehicleName ?? "-",
            date(entry.date),
            <span className="block text-right font-medium text-white" key="value">{currency(entry.value)}</span>,
            <EditButton key="edit" onClick={() => startEdit(entry)} />,
          ])}
        />
      </Section>
        </ManagementGrid>
      </div>
    </>
  );
}

function resetPartForm(suppliers: Supplier[]) {
  return {
    name: "",
    sku: "",
    quantity: 0,
    minQuantity: 0,
    unitCost: 0,
    supplierId: suppliers[0]?.id ?? "",
  };
}

export function InventoryManager({
  partStock,
  suppliers,
}: {
  partStock: PartStock[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [partRows, setPartRows] = useEditableRecords(partStock);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => resetPartForm(suppliers));

  function reset() {
    setEditingId(null);
    setForm(resetPartForm(suppliers));
    setError("");
  }

  function startEdit(part: PartStock) {
    setEditingId(part.id);
    setForm({
      name: part.name,
      sku: part.sku,
      quantity: part.quantity,
      minQuantity: part.minQuantity,
      unitCost: part.unitCost,
      supplierId: part.supplierId ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <ManagementGrid>
      <Section>
        <PanelTitle
          description="Cadastre ou edite peças, SKU, custo, estoque mínimo e fornecedor."
          icon={PackagePlus}
          title={editingId ? "Editar peça" : "Nova peça"}
        />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitJson<PartStock>(
              editingId ? "PUT" : "POST",
              editingId ? `/api/inventory/${editingId}` : "/api/inventory",
              form,
              (saved) => {
                setPartRows((items) => upsertSavedItem(items, saved));
                reset();
                router.refresh();
              },
              setLoading,
              setError,
            );
          }}
        >
          <Field label="Nome da peça">
            <input className={inputClass()} required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="SKU">
              <input className={inputClass()} required value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
            </Field>
            <Field label="Fornecedor">
              <select className={inputClass()} value={form.supplierId} onChange={(event) => setForm((current) => ({ ...current, supplierId: event.target.value }))}>
                <option value="">Sem fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            <Field label="Qtd. atual">
              <input className={inputClass()} min={0} type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
            </Field>
            <Field label="Qtd. mínima">
              <input className={inputClass()} min={0} type="number" value={form.minQuantity} onChange={(event) => setForm((current) => ({ ...current, minQuantity: Number(event.target.value) }))} />
            </Field>
            <Field label="Custo unit.">
              <input className={inputClass()} min={0} step="0.01" type="number" value={form.unitCost} onChange={(event) => setForm((current) => ({ ...current, unitCost: Number(event.target.value) }))} />
            </Field>
          </div>
          <ErrorMessage error={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton loading={loading}>{editingId ? "Salvar alterações" : "Cadastrar peça"}</SubmitButton>
            {editingId ? <SecondaryButton onClick={reset}>Cancelar edição</SecondaryButton> : null}
          </div>
        </form>
      </Section>

      <Section>
        <PanelTitle
          description="Controle de estoque editável com alerta visual para reposição."
          icon={PackagePlus}
          title="Estoque de peças"
        />
        <MobileRecords
          records={partRows.map((part) => ({
            id: part.id,
            title: part.name,
            subtitle: `${part.sku} • ${part.supplierName ?? "Sem fornecedor"}`,
            action: <EditButton onClick={() => startEdit(part)} />,
            lines: [
              { label: "Qtd.", value: part.quantity },
              { label: "Mín.", value: part.minQuantity },
              { label: "Custo", value: currency(part.unitCost) },
              {
                label: "Risco",
                value: (
                  <span className={`rounded-full border px-2 py-1 text-xs ${part.quantity <= part.minQuantity ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`}>
                    {stockRisk(part)}
                  </span>
                ),
              },
            ],
          }))}
        />
        <Table
          columns={["Peça", "SKU", "Fornecedor", "Qtd.", "Mín.", "Custo", "Risco", "Ações"]}
          rows={partRows.map((part) => [
            <span className="font-medium text-white" key="name">{part.name}</span>,
            part.sku,
            part.supplierName ?? "-",
            <span className="block text-right text-zinc-300" key="qty">{part.quantity}</span>,
            <span className="block text-right" key="min">{part.minQuantity}</span>,
            <span className="block text-right text-zinc-300" key="cost">{currency(part.unitCost)}</span>,
            <span className={`rounded-full border px-2 py-1 text-xs ${part.quantity <= part.minQuantity ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`} key="risk">
              {stockRisk(part)}
            </span>,
            <EditButton key="edit" onClick={() => startEdit(part)} />,
          ])}
        />
      </Section>
    </ManagementGrid>
  );
}

function resetSupplierForm() {
  return {
    name: "",
    contact: "",
    email: "",
    phone: "",
    document: "",
  };
}

export function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [supplierRows, setSupplierRows] = useEditableRecords(suppliers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(resetSupplierForm);

  function reset() {
    setEditingId(null);
    setForm(resetSupplierForm());
    setError("");
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      document: supplier.document ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <ManagementGrid>
      <Section>
        <PanelTitle
          description="Cadastre ou edite contatos, documentos e canais de compra."
          icon={UserPlus}
          title={editingId ? "Editar fornecedor" : "Novo fornecedor"}
        />
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitJson<Supplier>(
              editingId ? "PUT" : "POST",
              editingId ? `/api/suppliers/${editingId}` : "/api/suppliers",
              form,
              (saved) => {
                setSupplierRows((items) => upsertSavedItem(items, saved));
                reset();
                router.refresh();
              },
              setLoading,
              setError,
            );
          }}
        >
          <Field label="Nome">
            <input className={inputClass()} required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Contato">
            <input className={inputClass()} required value={form.contact} onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))} />
          </Field>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="E-mail">
              <input className={inputClass()} required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Telefone">
              <input className={inputClass()} required value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
          </div>
          <Field label="Documento">
            <input className={inputClass()} value={form.document} onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))} />
          </Field>
          <ErrorMessage error={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SubmitButton loading={loading}>{editingId ? "Salvar alterações" : "Cadastrar fornecedor"}</SubmitButton>
            {editingId ? <SecondaryButton onClick={reset}>Cancelar edição</SecondaryButton> : null}
          </div>
        </form>
      </Section>

      <Section>
        <PanelTitle
          description="Fornecedores editáveis para compras e reposição de estoque."
          icon={UserPlus}
          title="Fornecedores cadastrados"
        />
        <MobileRecords
          records={supplierRows.map((supplier) => ({
            id: supplier.id,
            title: supplier.name,
            subtitle: supplier.contact,
            action: <EditButton onClick={() => startEdit(supplier)} />,
            lines: [
              { label: "E-mail", value: supplier.email },
              { label: "Telefone", value: supplier.phone },
              { label: "Documento", value: supplier.document ?? "-" },
            ],
          }))}
        />
        <Table
          columns={["Fornecedor", "Contato", "E-mail", "Telefone", "Documento", "Ações"]}
          rows={supplierRows.map((supplier) => [
            <span className="font-medium text-white" key="name">{supplier.name}</span>,
            supplier.contact,
            supplier.email,
            supplier.phone,
            supplier.document ?? "-",
            <EditButton key="edit" onClick={() => startEdit(supplier)} />,
          ])}
        />
      </Section>
    </ManagementGrid>
  );
}
