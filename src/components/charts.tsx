"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactCurrency, currency } from "@/lib/format";
import type { DashboardData, MonthlyMetric, ReportData } from "@/lib/types";

const palette = ["#2dd4bf", "#f59e0b", "#fb7185", "#60a5fa", "#a3e635", "#c084fc"];

function useClientReady() {
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setClientReady(true));
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  return clientReady;
}

function currencyAxis(value: number | string) {
  return compactCurrency(Number(value));
}

function shouldRenderAsCount(name: string) {
  const normalized = name.toLowerCase();
  return (
    normalized.includes("quantidade") ||
    normalized.includes("veiculos") ||
    normalized.includes("veículos") ||
    normalized.includes("entraram") ||
    normalized.includes("sairam") ||
    normalized.includes("saíram")
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-[8px] border border-white/10 bg-[#0d1210] px-3 py-2 shadow-xl">
      {label ? <p className="mb-1 text-xs text-zinc-400">{label}</p> : null}
      {payload.map((item) => (
        <p className="text-sm text-white" key={item.name}>
          <span style={{ color: item.color }}>*</span> {item.name}:{" "}
          {shouldRenderAsCount(item.name) ? item.value : currency(Number(item.value))}
        </p>
      ))}
    </div>
  );
}

function ChartFrame({
  title,
  children,
}: {
  title: string;
  children: (size: { height: number; width: number }) => React.ReactNode;
}) {
  const clientReady = useClientReady();
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const height = 280;

  useEffect(() => {
    if (!clientReady || !frameRef.current) {
      return;
    }

    const updateWidth = () => {
      setWidth(Math.max(120, Math.floor(frameRef.current?.clientWidth ?? 0)));
    };
    const observer = new ResizeObserver(updateWidth);

    updateWidth();
    observer.observe(frameRef.current);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [clientReady]);

  return (
    <div className="app-surface min-w-0 rounded-[8px] p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      <div className="h-[280px] w-full min-w-0 overflow-hidden" ref={frameRef}>
        {clientReady && width > 0 ? children({ height, width }) : null}
      </div>
    </div>
  );
}

export function DashboardCharts({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame title="Movimento diario da frota">
        {({ height, width }) => (
          <BarChart data={data.dailyOperations} height={height} margin={{ bottom: 10 }} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis
              dataKey="date"
              interval="preserveStartEnd"
              minTickGap={18}
              stroke="#7d8982"
              tick={{ fontSize: 10 }}
              tickLine={false}
            />
            <YAxis allowDecimals={false} stroke="#7d8982" tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="vehiclesIn" fill="#2dd4bf" name="Veiculos que entraram" radius={[6, 6, 0, 0]} />
            <Bar dataKey="vehiclesOut" fill="#60a5fa" name="Veiculos que sairam" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ChartFrame>

      <ChartFrame title="Faturamento diario e mensal">
        {({ height, width }) => (
          <ComposedChart data={data.dailyOperations} height={height} margin={{ bottom: 10 }} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis
              dataKey="date"
              interval="preserveStartEnd"
              minTickGap={18}
              stroke="#7d8982"
              tick={{ fontSize: 10 }}
              tickLine={false}
            />
            <YAxis stroke="#7d8982" tickFormatter={currencyAxis} tickLine={false} width={74} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="dailyRevenue" fill="#2dd4bf" name="Faturamento diario" radius={[6, 6, 0, 0]} />
            <Line
              dataKey="monthlyRevenue"
              dot={false}
              name="Faturamento mensal"
              stroke="#f59e0b"
              strokeWidth={3}
              type="monotone"
            />
          </ComposedChart>
        )}
      </ChartFrame>

      <ChartFrame title="Entradas, saidas e lucro">
        {({ height, width }) => (
          <BarChart data={data.monthlyFinancial} height={height} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="month" stroke="#7d8982" tickLine={false} />
            <YAxis stroke="#7d8982" tickFormatter={currencyAxis} tickLine={false} width={74} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="income" fill="#2dd4bf" name="Entradas" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" fill="#fb7185" name="Saidas" radius={[6, 6, 0, 0]} />
            <Bar dataKey="profit" fill="#f59e0b" name="Lucro" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ChartFrame>

      <ChartFrame title="Evolucao do resultado">
        {({ height, width }) => (
          <AreaChart data={data.monthlyFinancial} height={height} width={width}>
            <defs>
              <linearGradient id="dashboard-profit" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="month" stroke="#7d8982" tickLine={false} />
            <YAxis stroke="#7d8982" tickFormatter={currencyAxis} tickLine={false} width={74} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              dataKey="profit"
              fill="url(#dashboard-profit)"
              name="Lucro"
              stroke="#f59e0b"
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        )}
      </ChartFrame>

      <ChartFrame title="Saidas por categoria">
        {({ height, width }) => (
          <PieChart height={height} width={width}>
            <Pie
              cx="50%"
              cy="50%"
              data={data.expenseByCategory}
              dataKey="value"
              innerRadius={58}
              nameKey="name"
              outerRadius={94}
              paddingAngle={3}
            >
              {data.expenseByCategory.map((_, index) => (
                <Cell fill={palette[index % palette.length]} key={index} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        )}
      </ChartFrame>

      <ChartFrame title="Veiculos com maior saida">
        {({ height, width }) => (
          <BarChart data={data.vehicleExpenses} height={height} layout="vertical" margin={{ left: 24 }} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" horizontal={false} />
            <XAxis stroke="#7d8982" tickFormatter={currencyAxis} type="number" />
            <YAxis dataKey="name" stroke="#7d8982" tickLine={false} type="category" width={116} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Saida" radius={[0, 6, 6, 0]}>
              {data.vehicleExpenses.map((_, index) => (
                <Cell fill={palette[index % palette.length]} key={index} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ChartFrame>

      <ChartFrame title="Pecas mais usadas">
        {({ height, width }) => (
          <BarChart data={data.topParts} height={height} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="name" interval={0} stroke="#7d8982" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis stroke="#7d8982" tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="quantity" name="Quantidade" radius={[6, 6, 0, 0]}>
              {data.topParts.map((_, index) => (
                <Cell fill={palette[index % palette.length]} key={index} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ChartFrame>

      <ChartFrame title="Tipos de manutencao">
        {({ height, width }) => (
          <PieChart height={height} width={width}>
            <Pie
              cx="50%"
              cy="50%"
              data={data.maintenanceByType}
              dataKey="value"
              innerRadius={58}
              nameKey="name"
              outerRadius={94}
              paddingAngle={3}
            >
              {data.maintenanceByType.map((_, index) => (
                <Cell fill={palette[index % palette.length]} key={index} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        )}
      </ChartFrame>
    </div>
  );
}

export function FinanceCharts({
  monthly,
  vehicleExpenses,
}: {
  monthly: MonthlyMetric[];
  vehicleExpenses: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame title="Entradas, saidas e resultado">
        {({ height, width }) => (
          <BarChart data={monthly} height={height} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="month" stroke="#7d8982" tickLine={false} />
            <YAxis stroke="#7d8982" tickFormatter={currencyAxis} tickLine={false} width={74} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="income" fill="#2dd4bf" name="Entradas" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" fill="#fb7185" name="Saidas" radius={[6, 6, 0, 0]} />
            <Bar dataKey="profit" fill="#f59e0b" name="Resultado" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ChartFrame>

      <ChartFrame title="Despesas por veiculo">
        {({ height, width }) => (
          <BarChart data={vehicleExpenses} height={height} layout="vertical" margin={{ left: 24 }} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" horizontal={false} />
            <XAxis stroke="#7d8982" tickFormatter={currencyAxis} type="number" />
            <YAxis dataKey="name" stroke="#7d8982" tickLine={false} type="category" width={116} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Despesa" radius={[0, 6, 6, 0]}>
              {vehicleExpenses.map((_, index) => (
                <Cell fill={palette[index % palette.length]} key={index} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
    </div>
  );
}

export function ReportCharts({ report }: { report: ReportData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame title="Historico do periodo">
        {({ height, width }) => (
          <AreaChart data={report.monthly} height={height} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="month" stroke="#7d8982" tickLine={false} />
            <YAxis stroke="#7d8982" tickFormatter={currencyAxis} tickLine={false} width={74} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              dataKey="profit"
              fill="rgba(245,158,11,.18)"
              name="Resultado"
              stroke="#f59e0b"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        )}
      </ChartFrame>

      <ChartFrame title="Pecas mais utilizadas no filtro">
        {({ height, width }) => (
          <BarChart data={report.parts} height={height} width={width}>
            <CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false} />
            <XAxis dataKey="name" interval={0} stroke="#7d8982" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis stroke="#7d8982" tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="quantity" name="Quantidade" radius={[6, 6, 0, 0]}>
              {report.parts.map((_, index) => (
                <Cell fill={palette[index % palette.length]} key={index} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
    </div>
  );
}
