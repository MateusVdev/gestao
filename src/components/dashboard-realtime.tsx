"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Bike,
  Boxes,
  CalendarClock,
  Car,
  CheckCircle2,
  DollarSign,
  Gauge,
  Package,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { DashboardCharts } from "@/components/charts";
import { Section } from "@/components/page";
import { currency, date, number, percent } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

const refreshIntervalMs = 30_000;

function nextMidnightDelay() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setDate(now.getDate() + 1);
  nextMidnight.setHours(0, 0, 3, 0);
  return Math.max(1_000, nextMidnight.getTime() - now.getTime());
}

function formatUpdatedAt(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ElementType;
  tone: "teal" | "amber" | "rose" | "blue";
}) {
  const tones = {
    teal: "bg-teal-300/12 text-teal-200",
    amber: "bg-amber-300/12 text-amber-200",
    rose: "bg-rose-300/12 text-rose-200",
    blue: "bg-sky-300/12 text-sky-200",
  };

  return (
    <section className="app-surface rounded-[8px] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-xs text-zinc-500">{detail}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-[8px] ${tones[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </section>
  );
}

function CompactKpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-teal-300/30 hover:bg-white/[0.055]">
      <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function alertTone(status: "critical" | "attention" | "normal") {
  const tones = {
    critical: "border-rose-400/30 bg-rose-400/10 text-rose-100",
    attention: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    normal: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  };

  return tones[status];
}

function alertLabel(status: "critical" | "attention" | "normal") {
  const labels = {
    critical: "critico",
    attention: "atencao",
    normal: "normal",
  };

  return labels[status];
}

function typeBadgeClass(type: string) {
  const classes: Record<string, string> = {
    INFO: "bg-sky-400/12 text-sky-200 border-sky-400/20",
    WARNING: "bg-amber-400/12 text-amber-200 border-amber-400/20",
    DANGER: "bg-rose-400/12 text-rose-200 border-rose-400/20",
    SUCCESS: "bg-emerald-400/12 text-emerald-200 border-emerald-400/20",
  };
  return classes[type] || classes.INFO;
}

function DashboardNotifications({ notifications }: { notifications: any[] }) {
  const active = notifications.filter((n) => n.status !== "RESOLVED").slice(0, 6);

  if (!active.length) {
    return (
      <div className="rounded-[8px] border border-white/5 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-xs text-zinc-500">Sem atividades recentes pendentes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {active.map((notification) => (
        <Link
          className="block rounded-[8px] border border-white/8 bg-white/[0.03] p-3 transition hover:bg-white/[0.05]"
          href={notification.link || "/dashboard"}
          key={notification.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{notification.title}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${typeBadgeClass(notification.type)}`}>
                  {notification.status === "UNREAD" ? "Nova" : "Lida"}
                </span>
                <span className="text-[10px] text-zinc-500">{date(notification.createdAt)}</span>
              </div>
            </div>
            {notification.status === "UNREAD" && (
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400 mt-1.5 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">
            {notification.message}
          </p>
        </Link>
      ))}
    </div>
  );
}

function FinancialIndicator({ data }: { data: DashboardData }) {
  const analysis = data.financialAnalysis;
  const status = {
    above: {
      icon: ArrowUpCircle,
      label: "Acima da média",
      tone: "border-teal-300/25 bg-teal-300/10 text-teal-100",
      text: "O faturamento mensal está acima da média histórica.",
    },
    below: {
      icon: ArrowDownCircle,
      label: "Abaixo da média",
      tone: "border-rose-300/25 bg-rose-300/10 text-rose-100",
      text: "O faturamento mensal está abaixo da média histórica.",
    },
    expected: {
      icon: CheckCircle2,
      label: "Dentro do esperado",
      tone: "border-sky-300/25 bg-sky-300/10 text-sky-100",
      text: "O faturamento mensal está dentro da faixa esperada.",
    },
  }[analysis.status];
  const Icon = status.icon;

  return (
    <Section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Análise financeira</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{status.text}</p>
        </div>
        <div className={`flex min-w-[240px] items-center gap-3 rounded-[8px] border p-3 ${status.tone}`}>
          <Icon size={22} />
          <div>
            <p className="text-sm font-semibold">{status.label}</p>
            <p className="mt-1 text-xs opacity-80">
              {percent(analysis.differencePercent)} vs. média de{" "}
              {currency(analysis.monthlyAverage)}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function MaintenanceOverview({ data }: { data: DashboardData }) {
  const overview = data.maintenanceOverview;

  return (
    <Section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={18} className="text-amber-200" />
          <h2 className="text-sm font-semibold text-white">Veículos em manutenção</h2>
        </div>
        <span className="w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
          {overview.count === 0
            ? "0 veículos em manutenção"
            : `${number(overview.count)} ${
                overview.count === 1 ? "veículo em manutenção" : "veículos em manutenção"
              }`}
        </span>
      </div>

      {overview.count === 0 ? (
        <div className="rounded-[8px] border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-zinc-500">
          0 veículos em manutenção
        </div>
      ) : (
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4 font-medium">Veículo</th>
                <th className="py-3 pr-4 font-medium">Placa</th>
                <th className="py-3 pr-4 font-medium">Motorista</th>
                <th className="py-3 pr-4 text-right font-medium">Km</th>
              </tr>
            </thead>
            <tbody>
              {overview.vehicles.map((vehicle) => (
                <tr className="border-b border-white/6 last:border-0" key={vehicle.id}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-white">{vehicle.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{vehicle.model}</p>
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">{vehicle.plate}</td>
                  <td className="py-3 pr-4 text-zinc-400">{vehicle.driver}</td>
                  <td className="py-3 pr-4 text-right text-zinc-300">
                    {vehicle.mileage.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

export function DashboardRealtime({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.ok) {
        const nextData = await response.json();
        setData(nextData);
        setLastUpdatedAt(new Date());
      }
    } catch (err) {
      console.error("Dashboard refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refresh();
    }, refreshIntervalMs);

    return () => window.clearInterval(interval);
  }, [refresh]);

  const updatedAt = useMemo(() => formatUpdatedAt(lastUpdatedAt), [lastUpdatedAt]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">Atualizado automaticamente em {updatedAt}</p>
        <button
          className="flex h-10 w-fit items-center justify-center gap-2 rounded-[8px] border border-white/10 px-3 text-sm font-medium text-zinc-200 transition hover:bg-white/7 disabled:cursor-wait disabled:opacity-70"
          disabled={refreshing}
          onClick={refresh}
          type="button"
        >
          <RefreshCw className={refreshing ? "animate-spin" : ""} size={16} />
          Atualizar agora
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <MetricCard
          detail="Entradas registradas hoje"
          icon={DollarSign}
          title="Faturamento hoje"
          tone="teal"
          value={currency(data.metrics.dailyIncome)}
        />
        <MetricCard
          detail={`${percent(data.metrics.incomeChange)} vs. mês anterior`}
          icon={TrendingUp}
          title="Faturamento mensal"
          tone="teal"
          value={currency(data.metrics.monthlyIncome)}
        />
        <MetricCard
          detail={`${percent(data.metrics.expenseChange)} vs. mês anterior`}
          icon={TrendingDown}
          title="Saídas do mês"
          tone="rose"
          value={currency(data.metrics.monthlyExpenses)}
        />
        <MetricCard
          detail={`${percent(data.metrics.profitChange)} vs. mês anterior`}
          icon={DollarSign}
          title="Resultado"
          tone={data.metrics.monthlyProfit >= 0 ? "teal" : "rose"}
          value={currency(data.metrics.monthlyProfit)}
        />
        <MetricCard
          detail="Frota cadastrada"
          icon={Car}
          title="Veículos"
          tone="blue"
          value={number(data.metrics.vehicleCount)}
        />
        <MetricCard
          detail="Status atual da frota"
          icon={Wrench}
          title="Em manutenção"
          tone="amber"
          value={number(data.metrics.maintenanceCount)}
        />
        <MetricCard
          detail="Valor imobilizado em pecas"
          icon={Boxes}
          title="Estoque"
          tone="blue"
          value={currency(data.metrics.inventoryValue)}
        />
        <MetricCard
          detail="Compras de pecas no mes"
          icon={Boxes}
          title="Custo estoque"
          tone="amber"
          value={currency(data.metrics.stockCosts)}
        />
        <MetricCard
          detail="Multas integradas ao financeiro"
          icon={ShieldAlert}
          title="Multas"
          tone="rose"
          value={currency(data.metrics.fineCosts)}
        />
        <MetricCard
          detail="Motos de servico cadastradas"
          icon={Bike}
          title="Motos"
          tone="blue"
          value={number(data.metrics.serviceMotorcycleCount)}
        />
      </div>

      <Section className="mt-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Gauge size={18} className="text-teal-200" />
            <h2 className="text-sm font-semibold text-white">KPIs inteligentes</h2>
          </div>
          <span className="w-fit rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
            leitura operacional em tempo real
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CompactKpi
            detail="media mensal por frota"
            label="Custo medio por veiculo"
            value={currency(data.advancedKpis.averageCostPerVehicle)}
          />
          <CompactKpi
            detail="despesa dividida por km total"
            label="Custo por KM"
            value={currency(data.advancedKpis.costPerKm)}
          />
          <CompactKpi
            detail="abastecimentos do periodo"
            label="Media combustivel"
            value={currency(data.advancedKpis.averageFuelCost)}
          />
          <CompactKpi
            detail="multas integradas ao financeiro"
            label="Media de multas"
            value={currency(data.advancedKpis.averageFineCost)}
          />
          <CompactKpi
            detail="maior custo unitario"
            label="Peca mais cara"
            value={
              data.advancedKpis.mostExpensivePart
                ? `${data.advancedKpis.mostExpensivePart.name} · ${currency(data.advancedKpis.mostExpensivePart.value)}`
                : "-"
            }
          />
          <CompactKpi
            detail="maior volume em compras"
            label="Fornecedor mais usado"
            value={
              data.advancedKpis.topSupplier
                ? `${data.advancedKpis.topSupplier.name} · ${currency(data.advancedKpis.topSupplier.value)}`
                : "-"
            }
          />
          <CompactKpi
            detail="maior despesa mensal"
            label="Veiculo mais caro"
            value={
              data.advancedKpis.mostExpensiveVehicle
                ? `${data.advancedKpis.mostExpensiveVehicle.name} · ${currency(data.advancedKpis.mostExpensiveVehicle.value)}`
                : "-"
            }
          />
          <CompactKpi
            detail="resultado operacional"
            label="Lucro operacional"
            value={currency(data.advancedKpis.operationalProfit)}
          />
        </div>
      </Section>

      <div className="mt-4">
        <FinancialIndicator data={data} />
      </div>

      <div className="mt-4">
        <DashboardCharts data={data} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <MaintenanceOverview data={data} />

          <Section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Manutenções recentes</h2>
              <CalendarClock size={18} className="text-zinc-500" />
            </div>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                  <tr className="border-b border-white/10">
                    <th className="py-3 pr-4 font-medium">Veículo</th>
                    <th className="py-3 pr-4 font-medium">Tipo</th>
                    <th className="py-3 pr-4 font-medium">Data</th>
                    <th className="py-3 pr-4 font-medium">Mecânico</th>
                    <th className="py-3 pr-4 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMaintenances.map((maintenance) => (
                    <tr className="border-b border-white/6 last:border-0" key={maintenance.id}>
                      <td className="py-3 pr-4 text-white">{maintenance.vehicleName}</td>
                      <td className="py-3 pr-4 text-zinc-300">{maintenance.type}</td>
                      <td className="py-3 pr-4 text-zinc-400">{date(maintenance.date)}</td>
                      <td className="py-3 pr-4 text-zinc-400">{maintenance.mechanic}</td>
                      <td className="py-3 pr-4 text-right font-medium text-white">
                        {currency(maintenance.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          <Section>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-200" />
              <h2 className="text-sm font-semibold text-white">Alertas inteligentes</h2>
            </div>
            <div className="space-y-3">
              {data.alerts.slice(0, 10).map((alert) => (
                <Link
                  className="block rounded-[8px] border border-white/8 bg-white/[0.03] p-3 transition hover:-translate-y-0.5 hover:bg-white/[0.055]"
                  href={alert.targetHref ?? "/dashboard"}
                  key={alert.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <span className={`rounded-full border px-2 py-1 text-[11px] ${alertTone(alert.status)}`}>
                      {alertLabel(alert.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {alert.description}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-zinc-600">
                    {alert.module}
                  </p>
                </Link>
              ))}
            </div>
          </Section>

          <Section>
            <div className="mb-4 flex items-center gap-2">
              <RefreshCw size={18} className="text-sky-200" />
              <h2 className="text-sm font-semibold text-white">Notificacoes recentes</h2>
            </div>
            <DashboardNotifications notifications={data.notifications} />
            <Link
              className="mt-4 flex h-9 items-center justify-center rounded-[8px] border border-white/10 text-xs font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
              href="/logs?tab=notifications"
            >
              Historico Completo
            </Link>
          </Section>

          <Section>
            <div className="mb-4 flex items-center gap-2">
              <Boxes size={18} className="text-teal-200" />
              <h2 className="text-sm font-semibold text-white">Estoque em atenção</h2>
            </div>
            <div className="space-y-3">
              {data.lowStock.map((part) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-[8px] border border-white/8 bg-white/[0.03] p-3"
                  key={part.id}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{part.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">Mínimo: {part.minQuantity} un.</p>
                  </div>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-200">
                    {part.quantity} un.
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
