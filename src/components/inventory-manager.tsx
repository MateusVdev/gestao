"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileSpreadsheet,
  FileText,
  History,
  PackageCheck,
  PackagePlus,
  PlusCircle,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { Section } from "@/components/page";
import { cn, currency, date } from "@/lib/format";
import type { PartStock, StockMovement, Supplier } from "@/lib/types";

type HttpMethod = "POST" | "PUT";
type InventoryTab = "stock" | "new" | "entry";
type SortDirection = "asc" | "desc";
type InventorySortKey =
  | "name"
  | "category"
  | "supplier"
  | "quantity"
  | "unitCost"
  | "total"
  | "status"
  | "lastEntry";
type InventorySort = { key: InventorySortKey; direction: SortDirection };

const STOCK_PAGE_SIZE = 8;

const inventoryTabs: Array<{ id: InventoryTab; label: string; icon: React.ElementType }> = [
  { id: "stock", label: "Estoque", icon: Boxes },
  { id: "new", label: "Nova peca", icon: PackagePlus },
  { id: "entry", label: "Entrada de peca", icon: TrendingUp },
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
  tone?: "neutral" | "teal" | "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs font-medium transition hover:-translate-y-0.5",
        tone === "teal" && "border-teal-300/25 bg-teal-300/10 text-teal-100 hover:bg-teal-300/15",
        tone === "danger" && "border-rose-400/25 bg-rose-400/8 text-rose-100 hover:bg-rose-400/12",
        tone === "neutral" && "border-white/10 text-zinc-200 hover:bg-white/7",
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
  activeSort: InventorySort;
  column: InventorySortKey;
  label: string;
  onSort: (column: InventorySortKey) => void;
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
  activeTab: InventoryTab;
  onChange: (tab: InventoryTab) => void;
}) {
  return (
    <>
      <div className="lg:hidden">
        <Field label="Modulo">
          <select className={inputClass()} value={activeTab} onChange={(event) => onChange(event.target.value as InventoryTab)}>
            {inventoryTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <nav className="hidden min-w-0 rounded-[8px] border border-white/10 bg-white/[0.025] p-2 lg:block">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Almoxarifado
        </p>
        <div className="grid gap-1">
          {inventoryTabs.map((tab) => {
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

async function deleteJson(
  url: string,
  onDone: () => void,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
) {
  setLoading(true);
  setError("");

  try {
    const response = await fetch(url, { method: "DELETE" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.message ?? "Nao foi possivel excluir.");
      return;
    }
    onDone();
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

function resetPartForm(suppliers: Supplier[]) {
  return {
    name: "",
    category: "Freios",
    sku: "",
    manufacturer: "",
    quantity: 0,
    minQuantity: 1,
    unitCost: 0,
    entryDate: new Date().toISOString().slice(0, 10),
    supplierId: suppliers[0]?.id ?? "",
    notes: "",
  };
}

function resetEntryForm(parts: PartStock[], suppliers: Supplier[]) {
  return {
    partStockId: parts[0]?.id ?? "",
    quantity: 1,
    unitCost: parts[0]?.unitCost ?? 0,
    date: new Date().toISOString().slice(0, 10),
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplierId: parts[0]?.supplierId ?? suppliers[0]?.id ?? "",
    invoiceNumber: "",
    responsibleUser: "Administrador",
    notes: "",
  };
}

function stockStatus(part: PartStock) {
  if (part.quantity <= 0) return "Sem estoque";
  if (part.quantity <= part.minQuantity) return "Estoque baixo";
  return "Estoque normal";
}

function stockStatusClass(part: PartStock) {
  if (part.quantity <= 0) return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (part.quantity <= part.minQuantity) return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
}

function lastEntryDate(part: PartStock) {
  return part.lastEntryDate ?? part.entryDate;
}

function compareValues(first: string | number, second: string | number, direction: SortDirection) {
  const result =
    typeof first === "number" && typeof second === "number"
      ? first - second
      : String(first).localeCompare(String(second), "pt-BR");

  return direction === "asc" ? result : -result;
}

function compareParts(first: PartStock, second: PartStock, sort: InventorySort) {
  const getValue = (part: PartStock): string | number => {
    switch (sort.key) {
      case "name":
        return part.name;
      case "category":
        return part.category;
      case "supplier":
        return part.supplierName ?? "";
      case "quantity":
        return part.quantity;
      case "unitCost":
        return part.unitCost;
      case "total":
        return part.quantity * part.unitCost;
      case "status":
        return stockStatus(part);
      case "lastEntry":
        return new Date(lastEntryDate(part)).getTime();
      default:
        return part.name;
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
  movements,
  onClose,
  part,
}: {
  movements: StockMovement[];
  onClose: () => void;
  part: PartStock;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="app-surface max-h-[82vh] w-full max-w-3xl overflow-hidden rounded-[8px]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 p-4">
          <PanelTitle icon={History} meta={`${movements.length} movimentacoes`} title={part.name} />
          <button
            className="grid h-9 w-9 place-items-center rounded-[8px] border border-white/10 text-zinc-300 transition hover:bg-white/7"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-4">
          {movements.length ? (
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 font-medium">Tipo</th>
                  <th className="py-3 pr-4 font-medium">Quantidade</th>
                  <th className="py-3 pr-4 font-medium">Valor unit.</th>
                  <th className="py-3 pr-4 font-medium">Total</th>
                  <th className="py-3 pr-4 font-medium">Data</th>
                  <th className="py-3 pr-4 font-medium">Responsavel</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr className="border-b border-white/6 last:border-0" key={movement.id}>
                    <td className="py-3 pr-4">
                      <Badge className={movement.kind === "IN" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200"}>
                        {movement.kind === "IN" ? "Entrada" : "Saida"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">{movement.quantity}</td>
                    <td className="py-3 pr-4 text-zinc-300">{currency(movement.unitCost)}</td>
                    <td className="py-3 pr-4 font-medium text-white">{currency(movement.totalValue)}</td>
                    <td className="py-3 pr-4 text-zinc-400">{date(movement.date)}</td>
                    <td className="py-3 pr-4 text-zinc-400">{movement.responsibleUser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState>Nenhum historico para esta peca.</EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileStock({
  onDelete,
  onEdit,
  onEntry,
  onHistory,
  rows,
}: {
  onDelete: (part: PartStock) => void;
  onEdit: (part: PartStock) => void;
  onEntry: (part: PartStock) => void;
  onHistory: (part: PartStock) => void;
  rows: PartStock[];
}) {
  return (
    <div className="grid gap-3 lg:hidden">
      {rows.map((part) => (
        <article className="min-w-0 rounded-[8px] border border-white/10 bg-white/[0.03] p-4" key={part.id}>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-sm font-semibold text-white">{part.name}</h3>
              <p className="mt-1 text-xs text-zinc-500">{part.category} - {part.supplierName ?? "Sem fornecedor"}</p>
            </div>
            <Badge className={stockStatusClass(part)}>{stockStatus(part)}</Badge>
          </div>
          <div className="mt-4 grid gap-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <span className="text-zinc-500">Quantidade</span>
              <span className="text-right text-zinc-200">{part.quantity}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <span className="text-zinc-500">Valor unit.</span>
              <span className="text-right text-zinc-200">{currency(part.unitCost)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <span className="text-zinc-500">Total</span>
              <span className="text-right font-medium text-white">{currency(part.quantity * part.unitCost)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <span className="text-zinc-500">Ultima entrada</span>
              <span className="text-right text-zinc-200">{date(lastEntryDate(part))}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <IconButton icon={Edit3} onClick={() => onEdit(part)}>Editar</IconButton>
            <IconButton icon={PlusCircle} onClick={() => onEntry(part)} tone="teal">Registrar entrada</IconButton>
            <IconButton icon={History} onClick={() => onHistory(part)}>Historico</IconButton>
            <IconButton icon={Trash2} onClick={() => onDelete(part)} tone="danger">Excluir</IconButton>
          </div>
        </article>
      ))}
    </div>
  );
}

export function InventoryManager({
  partStock,
  stockMovements,
  suppliers,
}: {
  partStock: PartStock[];
  stockMovements: StockMovement[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<InventoryTab>("stock");
  const [partRows, setPartRows] = useState(partStock);
  const [movementRows, setMovementRows] = useState(stockMovements);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyPart, setHistoryPart] = useState<PartStock | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PartStock | null>(null);
  const [partLoading, setPartLoading] = useState(false);
  const [entryLoading, setEntryLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [partError, setPartError] = useState("");
  const [entryError, setEntryError] = useState("");
  const [stockError, setStockError] = useState("");
  const [partSuccess, setPartSuccess] = useState("");
  const [entrySuccess, setEntrySuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockPage, setStockPage] = useState(1);
  const [stockSort, setStockSort] = useState<InventorySort>({ key: "name", direction: "asc" });
  const [form, setForm] = useState(() => resetPartForm(suppliers));
  const [entryForm, setEntryForm] = useState(() => resetEntryForm(partStock, suppliers));

  const categories = useMemo(
    () => Array.from(new Set(partRows.map((part) => part.category))).sort(),
    [partRows],
  );
  const stockValue = useMemo(
    () => partRows.reduce((total, part) => total + part.quantity * part.unitCost, 0),
    [partRows],
  );
  const lowStockCount = useMemo(
    () => partRows.filter((part) => stockStatus(part) !== "Estoque normal").length,
    [partRows],
  );
  const selectedEntryPart = useMemo(
    () => partRows.find((part) => part.id === entryForm.partStockId),
    [entryForm.partStockId, partRows],
  );
  const historyMovements = useMemo(
    () =>
      historyPart
        ? movementRows
            .filter((movement) => movement.partStockId === historyPart.id)
            .sort((first, second) => second.date.localeCompare(first.date))
        : [],
    [historyPart, movementRows],
  );
  const filteredParts = useMemo(() => {
    const normalized = normalizeText(query);

    return partRows
      .filter((part) => {
        const matchesText =
          !normalized ||
          [part.name, part.sku, part.category, part.manufacturer, part.supplierName ?? ""].some((value) =>
            value.toLowerCase().includes(normalized),
          );
        const matchesStatus = statusFilter === "all" || stockStatus(part) === statusFilter;
        const matchesCategory = categoryFilter === "all" || part.category === categoryFilter;
        return matchesText && matchesStatus && matchesCategory;
      })
      .sort((first, second) => compareParts(first, second, stockSort));
  }, [categoryFilter, partRows, query, statusFilter, stockSort]);
  const totalStockPages = Math.max(1, Math.ceil(filteredParts.length / STOCK_PAGE_SIZE));
  const currentStockPage = Math.min(stockPage, totalStockPages);
  const paginatedParts = filteredParts.slice(
    (currentStockPage - 1) * STOCK_PAGE_SIZE,
    currentStockPage * STOCK_PAGE_SIZE,
  );

  function changeTab(tab: InventoryTab) {
    setActiveTab(tab);
    setPartError("");
    setEntryError("");
    setStockError("");
    setPartSuccess("");
    setEntrySuccess("");
  }

  function resetPart() {
    setEditingId(null);
    setForm(resetPartForm(suppliers));
    setPartError("");
  }

  function startEdit(part: PartStock) {
    setEditingId(part.id);
    setForm({
      name: part.name,
      category: part.category,
      sku: part.sku,
      manufacturer: part.manufacturer,
      quantity: part.quantity,
      minQuantity: part.minQuantity,
      unitCost: part.unitCost,
      entryDate: part.entryDate,
      supplierId: part.supplierId ?? "",
      notes: part.notes ?? "",
    });
    changeTab("new");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prepareEntry(part: PartStock) {
    setEntryForm((current) => ({
      ...current,
      partStockId: part.id,
      quantity: Math.max(1, current.quantity),
      unitCost: part.unitCost,
      supplierId: part.supplierId ?? current.supplierId,
    }));
    changeTab("entry");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateSort(column: InventorySortKey) {
    setStockSort((current) => ({
      key: column,
      direction: current.key === column && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function resetStockPage() {
    setStockPage(1);
  }

  function deletePartRow(part: PartStock) {
    setPendingDelete(part);
  }

  function confirmDeletePart() {
    if (!pendingDelete) {
      return;
    }

    deleteJson(
      `/api/inventory/${pendingDelete.id}`,
      () => {
        setPartRows((items) => items.filter((item) => item.id !== pendingDelete.id));
        setStockError("");
        setPendingDelete(null);
        router.refresh();
      },
      setDeleteLoading,
      setStockError,
    );
  }

  return (
    <>
      {pendingDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[8px] border border-white/10 bg-[#121816] p-5 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-rose-400/12 text-rose-200">
                <Trash2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Mover peca para lixeira</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {pendingDelete.name} sera removida da tabela ativa, preservada na lixeira e registrada nos logs.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-[8px] border border-white/10 px-4 text-sm text-zinc-200 transition hover:bg-white/7"
                disabled={deleteLoading}
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="h-10 rounded-[8px] bg-rose-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-rose-300 disabled:opacity-60"
                disabled={deleteLoading}
                onClick={confirmDeletePart}
                type="button"
              >
                {deleteLoading ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Boxes} label="Valor total em estoque" value={currency(stockValue)} />
        <StatCard icon={TrendingUp} label="Entradas registradas" value={movementRows.filter((movement) => movement.kind === "IN").length} />
        <StatCard icon={PackageCheck} label="Saidas para manutencao" value={movementRows.filter((movement) => movement.kind === "OUT").length} />
        <StatCard icon={SlidersHorizontal} label="Alertas de estoque" value={lowStockCount} />
      </div>

      <Section className="overflow-hidden p-0">
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <PanelTitle icon={Boxes} meta="Fluxo compacto com abas inteligentes" title="Estoque e almoxarifado" />
            {activeTab === "stock" ? (
              <div className="flex flex-wrap gap-2">
                <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm font-medium text-zinc-200 transition hover:-translate-y-0.5 hover:bg-white/7" href="/api/inventory/export/pdf">
                  <FileText size={16} />
                  PDF
                </Link>
                <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-teal-300 px-3 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-teal-200" href="/api/inventory/export/excel">
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
            {activeTab === "stock" ? (
              <div className="min-w-0">
                <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <PanelTitle icon={Boxes} meta={`${filteredParts.length} itens encontrados`} title="Tabela de estoque" />
                  <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_170px_180px] xl:w-[800px]">
                    <label className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" size={16} />
                      <input
                        className="h-10 w-full pl-10 pr-3 text-sm"
                        placeholder="Pesquisar estoque"
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          resetStockPage();
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
                          resetStockPage();
                        }}
                      >
                        <option value="all">Todos status</option>
                        <option value="Estoque normal">Estoque normal</option>
                        <option value="Estoque baixo">Estoque baixo</option>
                        <option value="Sem estoque">Sem estoque</option>
                      </select>
                    </label>
                    <select
                      className="h-10 w-full px-3 text-sm"
                      value={categoryFilter}
                      onChange={(event) => {
                        setCategoryFilter(event.target.value);
                        resetStockPage();
                      }}
                    >
                      <option value="all">Todas categorias</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <ErrorMessage error={stockError} />
                {deleteLoading ? <p className="mb-3 text-sm text-zinc-500">Processando exclusao...</p> : null}

                {paginatedParts.length ? (
                  <>
                    <MobileStock
                      onDelete={deletePartRow}
                      onEdit={startEdit}
                      onEntry={prepareEntry}
                      onHistory={setHistoryPart}
                      rows={paginatedParts}
                    />
                    <div className="table-scroll hidden overflow-x-auto lg:block">
                      <table className="w-full min-w-[1180px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="py-3 pr-4"><SortButton activeSort={stockSort} column="name" label="Nome da peca" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={stockSort} column="category" label="Categoria" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={stockSort} column="supplier" label="Fornecedor" onSort={updateSort} /></th>
                            <th className="py-3 pr-4 text-right"><SortButton activeSort={stockSort} column="quantity" label="Quantidade" onSort={updateSort} /></th>
                            <th className="py-3 pr-4 text-right"><SortButton activeSort={stockSort} column="unitCost" label="Valor unit." onSort={updateSort} /></th>
                            <th className="py-3 pr-4 text-right"><SortButton activeSort={stockSort} column="total" label="Valor total" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={stockSort} column="status" label="Status" onSort={updateSort} /></th>
                            <th className="py-3 pr-4"><SortButton activeSort={stockSort} column="lastEntry" label="Ultima entrada" onSort={updateSort} /></th>
                            <th className="py-3 pr-4 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Acoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedParts.map((part) => (
                            <tr className="border-b border-white/6 transition hover:bg-white/[0.025] last:border-0" key={part.id}>
                              <td className="py-3 pr-4">
                                <p className="font-medium text-white">{part.name}</p>
                                <p className="mt-1 text-xs text-zinc-500">{part.sku} - {part.manufacturer}</p>
                              </td>
                              <td className="py-3 pr-4 text-zinc-300">{part.category}</td>
                              <td className="py-3 pr-4 text-zinc-400">{part.supplierName ?? "-"}</td>
                              <td className="py-3 pr-4 text-right font-medium text-white">{part.quantity}</td>
                              <td className="py-3 pr-4 text-right text-zinc-300">{currency(part.unitCost)}</td>
                              <td className="py-3 pr-4 text-right font-medium text-white">{currency(part.quantity * part.unitCost)}</td>
                              <td className="py-3 pr-4">
                                <Badge className={stockStatusClass(part)}>{stockStatus(part)}</Badge>
                              </td>
                              <td className="py-3 pr-4 text-zinc-400">{date(lastEntryDate(part))}</td>
                              <td className="py-3 pr-4">
                                <div className="flex flex-wrap gap-2">
                                  <IconButton icon={Edit3} onClick={() => startEdit(part)}>Editar</IconButton>
                                  <IconButton icon={PlusCircle} onClick={() => prepareEntry(part)} tone="teal">Registrar entrada</IconButton>
                                  <IconButton icon={History} onClick={() => setHistoryPart(part)}>Historico</IconButton>
                                  <IconButton icon={Trash2} onClick={() => deletePartRow(part)} tone="danger">Excluir</IconButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <EmptyState>Nenhum item de estoque encontrado.</EmptyState>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-500">
                    Pagina {currentStockPage} de {totalStockPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentStockPage <= 1}
                      onClick={() => setStockPage((page) => Math.max(1, page - 1))}
                      type="button"
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentStockPage >= totalStockPages}
                      onClick={() => setStockPage((page) => Math.min(totalStockPages, page + 1))}
                      type="button"
                    >
                      Proxima
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "new" ? (
              <div className="mx-auto max-w-4xl">
                <div className="mb-5">
                  <PanelTitle icon={PackagePlus} meta="Somente o formulario necessario fica visivel" title={editingId ? "Editar peca" : "Nova peca"} />
                </div>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setPartSuccess("");
                    submitJson<PartStock>(
                      editingId ? "PUT" : "POST",
                      editingId ? `/api/inventory/${editingId}` : "/api/inventory",
                      form,
                      (saved) => {
                        setPartRows((items) => upsertSavedItem(items, saved));
                        resetPart();
                        setPartSuccess(editingId ? "Peca atualizada com sucesso." : "Peca cadastrada com sucesso.");
                        setActiveTab("stock");
                        router.refresh();
                      },
                      setPartLoading,
                      setPartError,
                    );
                  }}
                >
                  <Field label="Nome da peca">
                    <input className={inputClass()} required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                  </Field>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Categoria">
                      <input className={inputClass()} required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
                    </Field>
                    <Field label="Codigo interno">
                      <input className={inputClass()} required value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Fabricante">
                      <input className={inputClass()} required value={form.manufacturer} onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))} />
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
                  <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                    <Field label="Quantidade">
                      <input className={inputClass()} min={0} type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
                    </Field>
                    <Field label="Estoque minimo">
                      <input className={inputClass()} min={0} type="number" value={form.minQuantity} onChange={(event) => setForm((current) => ({ ...current, minQuantity: Number(event.target.value) }))} />
                    </Field>
                    <Field label="Valor unitario">
                      <input className={inputClass()} min={0} step="0.01" type="number" value={form.unitCost} onChange={(event) => setForm((current) => ({ ...current, unitCost: Number(event.target.value) }))} />
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Data de entrada">
                      <input className={inputClass()} type="date" value={form.entryDate} onChange={(event) => setForm((current) => ({ ...current, entryDate: event.target.value }))} />
                    </Field>
                    <Field label="Valor total">
                      <div className="flex h-10 items-center justify-between gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] px-3 text-sm">
                        <span className="text-zinc-500">Atual</span>
                        <strong className="text-white">{currency(form.quantity * form.unitCost)}</strong>
                      </div>
                    </Field>
                  </div>
                  <Field label="Observacoes">
                    <textarea className={textareaClass()} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                  </Field>
                  <ErrorMessage error={partError} />
                  <SuccessMessage message={partSuccess} />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <SubmitButton loading={partLoading}>{editingId ? "Salvar alteracoes" : "Cadastrar peca"}</SubmitButton>
                    <SecondaryButton
                      onClick={() => {
                        resetPart();
                        changeTab("stock");
                      }}
                    >
                      Cancelar
                    </SecondaryButton>
                  </div>
                </form>
              </div>
            ) : null}

            {activeTab === "entry" ? (
              <div className="mx-auto max-w-4xl">
                <div className="mb-5">
                  <PanelTitle icon={TrendingUp} meta={selectedEntryPart ? `${selectedEntryPart.quantity} unidades em estoque` : "Reposicao de estoque"} title="Entrada de peca" />
                </div>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setEntrySuccess("");
                    submitJson<StockMovement>(
                      "POST",
                      "/api/inventory/entries",
                      entryForm,
                      (saved) => {
                        setMovementRows((items) => [saved, ...items]);
                        const nextParts = partRows.map((part) =>
                          part.id === saved.partStockId
                            ? {
                                ...part,
                                quantity: part.quantity + saved.quantity,
                                unitCost: saved.unitCost,
                                entryDate: saved.date,
                                lastEntryDate: saved.date,
                                supplierId: saved.supplierId ?? part.supplierId,
                                supplierName: saved.supplierName ?? part.supplierName,
                              }
                            : part,
                        );
                        setPartRows(nextParts);
                        setEntryForm(resetEntryForm(nextParts, suppliers));
                        setEntrySuccess("Entrada registrada com sucesso.");
                        setActiveTab("stock");
                        router.refresh();
                      },
                      setEntryLoading,
                      setEntryError,
                    );
                  }}
                >
                  <Field label="Peca">
                    <select
                      className={inputClass()}
                      required
                      value={entryForm.partStockId}
                      onChange={(event) => {
                        const selected = partRows.find((part) => part.id === event.target.value);
                        setEntryForm((current) => ({
                          ...current,
                          partStockId: event.target.value,
                          unitCost: selected?.unitCost ?? 0,
                          supplierId: selected?.supplierId ?? current.supplierId,
                        }));
                      }}
                    >
                      {partRows.map((part) => (
                        <option key={part.id} value={part.id}>{part.name} - {part.quantity} un.</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Quantidade">
                      <input className={inputClass()} min={1} type="number" value={entryForm.quantity} onChange={(event) => setEntryForm((current) => ({ ...current, quantity: Number(event.target.value) }))} />
                    </Field>
                    <Field label="Valor unitario">
                      <input className={inputClass()} min={0} step="0.01" type="number" value={entryForm.unitCost} onChange={(event) => setEntryForm((current) => ({ ...current, unitCost: Number(event.target.value) }))} />
                    </Field>
                  </div>
                  <div className="flex h-10 items-center justify-between gap-4 rounded-[8px] border border-white/10 bg-white/[0.03] px-3">
                    <span className="text-sm text-zinc-400">Valor total automatico</span>
                    <strong className="text-white">{currency(entryForm.quantity * entryForm.unitCost)}</strong>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Data da compra">
                      <input className={inputClass()} type="date" value={entryForm.date} onChange={(event) => setEntryForm((current) => ({ ...current, date: event.target.value }))} />
                    </Field>
                    <Field label="Fornecedor">
                      <select className={inputClass()} value={entryForm.supplierId} onChange={(event) => setEntryForm((current) => ({ ...current, supplierId: event.target.value }))}>
                        <option value="">Sem fornecedor</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <Field label="Nota fiscal">
                      <input className={inputClass()} value={entryForm.invoiceNumber} onChange={(event) => setEntryForm((current) => ({ ...current, invoiceNumber: event.target.value }))} />
                    </Field>
                    <Field label="Usuario responsavel">
                      <input className={inputClass()} required value={entryForm.responsibleUser} onChange={(event) => setEntryForm((current) => ({ ...current, responsibleUser: event.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Observacoes">
                    <textarea className={textareaClass()} value={entryForm.notes} onChange={(event) => setEntryForm((current) => ({ ...current, notes: event.target.value }))} />
                  </Field>
                  <ErrorMessage error={entryError} />
                  <SuccessMessage message={entrySuccess} />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <SubmitButton loading={entryLoading}>Registrar entrada</SubmitButton>
                    <SecondaryButton onClick={() => changeTab("stock")}>Cancelar</SecondaryButton>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      {historyPart ? (
        <HistoryModal movements={historyMovements} onClose={() => setHistoryPart(null)} part={historyPart} />
      ) : null}
    </>
  );
}
