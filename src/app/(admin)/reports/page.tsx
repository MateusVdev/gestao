import Link from "next/link";
import { Download, FileSpreadsheet, FileText, Filter } from "lucide-react";
import { ReportCharts } from "@/components/charts";
import { PageHeader, Section } from "@/components/page";
import { currency, date } from "@/lib/format";
import {
  getInventory,
  getMaintenances,
  getReport,
  getSettings,
  getStockMovements,
  getVehicles,
} from "@/lib/repository";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function exportHref(format: "pdf" | "excel", query: URLSearchParams) {
  return `/api/reports/export/${format}?${query.toString()}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [settings, vehicles, inventory, stockMovements, maintenances] = await Promise.all([
    getSettings(),
    getVehicles(),
    getInventory(),
    getStockMovements(),
    getMaintenances(),
  ]);

  const vehicleId = getParam(params, "vehicleId") ?? "";
  const from = getParam(params, "from") ?? "2026-01-01";
  const to = getParam(params, "to") ?? "2026-05-31";
  const period = getParam(params, "period") ?? "monthly";
  const query = new URLSearchParams();

  if (vehicleId) query.set("vehicleId", vehicleId);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  query.set("period", period);

  const report = await getReport({
    vehicleId: vehicleId || undefined,
    from,
    to,
    annual: period === "annual",
  });
  const stockMovementsInRange = stockMovements.filter((movement) =>
    (!from || movement.date >= from) && (!to || movement.date <= to),
  );
  const mostExpensiveParts = inventory.partStock
    .toSorted((first, second) => second.unitCost - first.unitCost)
    .slice(0, 5);
  const averagePartCost = inventory.partStock.length
    ? inventory.partStock.reduce((total, part) => total + part.unitCost, 0) / inventory.partStock.length
    : 0;
  const fleetCostByKm = vehicles
    .map((vehicle) => {
      const expense = report.entries
        .filter((entry) => entry.vehicleId === vehicle.id && entry.kind === "EXPENSE")
        .reduce((total, entry) => total + entry.value, 0);
      return {
        name: vehicle.name,
        maintenanceCount: maintenances.filter((item) => item.vehicleId === vehicle.id).length,
        costPerKm: vehicle.mileage ? expense / vehicle.mileage : 0,
        expense,
      };
    })
    .toSorted((first, second) => second.expense - first.expense)
    .slice(0, 6);
  const money = (value: number) => currency(value, settings.currency);

  return (
    <>
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              className="flex h-10 items-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm text-zinc-200 transition hover:bg-white/7"
              href={exportHref("pdf", query)}
            >
              <FileText size={17} />
              PDF
            </Link>
            <Link
              className="flex h-10 items-center gap-2 rounded-[8px] bg-teal-300 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-teal-200"
              href={exportHref("excel", query)}
            >
              <FileSpreadsheet size={17} />
              Excel
            </Link>
          </div>
        }
        description="Relatórios mensais e anuais com histórico completo, filtros e exportação."
        title="Relatórios"
      />

      <Section className="mb-4">
        <form className="grid gap-4 lg:grid-cols-[1fr_180px_180px_170px_120px]" method="GET">
          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Veículo
            </span>
            <select className="h-11 w-full px-3 text-sm" name="vehicleId" defaultValue={vehicleId}>
              <option value="">Todos os veículos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Data inicial
            </span>
            <input className="h-11 w-full px-3 text-sm" defaultValue={from} name="from" type="date" />
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Data final
            </span>
            <input className="h-11 w-full px-3 text-sm" defaultValue={to} name="to" type="date" />
          </label>
          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
              Tipo
            </span>
            <select className="h-11 w-full px-3 text-sm" name="period" defaultValue={period}>
              <option value="monthly">Mensal</option>
              <option value="annual">Anual</option>
            </select>
          </label>
          <button className="mt-6 flex h-11 items-center justify-center gap-2 rounded-[8px] bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200" type="submit">
            <Filter size={17} />
            Filtrar
          </button>
        </form>
      </Section>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Entradas" value={money(report.totals.income)} />
        <SummaryCard label="Saídas" value={money(report.totals.expenses)} />
        <SummaryCard label="Lucro/prejuízo" value={money(report.totals.profit)} />
        <SummaryCard label="Manutenção" value={money(report.totals.maintenances)} />
        <SummaryCard label="Combustível" value={money(report.totals.fuel)} />
        <SummaryCard label="Óleo" value={money(report.totals.oil)} />
      </div>
...

      <ReportCharts report={report} />

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Section>
          <h2 className="mb-4 text-sm font-semibold text-white">Relatorios financeiros inteligentes</h2>
          <div className="space-y-3">
            <SummaryCard label="Lucro mensal" value={money(report.totals.profit)} />
            <SummaryCard
              label="Crescimento"
              value={`${report.monthly.at(-1)?.profit && report.monthly.at(-2)?.profit ? (((report.monthly.at(-1)!.profit - report.monthly.at(-2)!.profit) / Math.max(1, Math.abs(report.monthly.at(-2)!.profit))) * 100).toFixed(1) : "0"}%`}
            />
            <SummaryCard label="Custos operacionais" value={money(report.totals.expenses)} />
          </div>
        </Section>

        <Section>
          <h2 className="mb-4 text-sm font-semibold text-white">Relatorios de estoque</h2>
          <div className="space-y-3 text-sm">
            <SummaryCard label="Custo medio de peca" value={money(averagePartCost)} />
            <SummaryCard label="Movimentacoes no periodo" value={String(stockMovementsInRange.length)} />
            <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-sm text-zinc-400">Pecas mais caras</p>
              <div className="space-y-2">
                {mostExpensiveParts.map((part) => (
                  <div className="flex justify-between gap-3 text-xs" key={part.id}>
                    <span className="truncate text-zinc-300">{part.name}</span>
                    <span className="shrink-0 font-medium text-white">{money(part.unitCost)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section>
          <h2 className="mb-4 text-sm font-semibold text-white">Relatorios de frota</h2>
          <div className="space-y-3">
            {fleetCostByKm.map((vehicle) => (
              <div className="rounded-[8px] border border-white/10 bg-white/[0.03] p-3" key={vehicle.name}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-white">{vehicle.name}</p>
                  <span className="text-xs text-zinc-500">{vehicle.maintenanceCount} manut.</span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Custo por KM: <span className="font-medium text-zinc-200">{money(vehicle.costPerKm)}</span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Despesas por veículo</h2>
            <Download size={18} className="text-zinc-500" />
          </div>
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 font-medium">Veículo</th>
                  <th className="py-3 pr-4 text-right font-medium">Manutenções</th>
                  <th className="py-3 pr-4 text-right font-medium">Despesa</th>
                </tr>
              </thead>
              <tbody>
                {report.vehicles.map((vehicle) => (
                  <tr className="border-b border-white/6 last:border-0" key={vehicle.name}>
                    <td className="py-3 pr-4 font-medium text-white">{vehicle.name}</td>
                    <td className="py-3 pr-4 text-right text-zinc-400">{vehicle.maintenances}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">
                      {money(vehicle.expense)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section>
          <h2 className="mb-4 text-sm font-semibold text-white">Histórico financeiro</h2>
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 font-medium">Data</th>
                  <th className="py-3 pr-4 font-medium">Categoria</th>
                  <th className="py-3 pr-4 font-medium">Descrição</th>
                  <th className="py-3 pr-4 font-medium">Veículo</th>
                  <th className="py-3 pr-4 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {report.entries.map((entry) => (
                  <tr className="border-b border-white/6 last:border-0" key={entry.id}>
                    <td className="py-3 pr-4 text-zinc-400">{date(entry.date)}</td>
                    <td className="py-3 pr-4 text-zinc-300">{entry.category}</td>
                    <td className="py-3 pr-4 text-zinc-400">{entry.description}</td>
                    <td className="py-3 pr-4 text-zinc-400">{entry.vehicleName ?? "-"}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">
                      {entry.kind === "EXPENSE" ? "-" : ""}
                      {money(entry.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </>
  );
}
