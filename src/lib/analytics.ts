import type {
  AppNotification,
  DashboardData,
  Dataset,
  DailyFleetMetric,
  FinancialAnalysis,
  FinancialEntry,
  MaintenanceRecord,
  MonthlyMetric,
  PartStock,
  ReportData,
  StockMovement,
  MotorcycleTrip,
  MotorcycleFine,
  ServiceMotorcycle,
  OperationalAlert,
  AdvancedKpis,
} from "@/lib/types";
import { currency } from "@/lib/format";

const monthOrder = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "mai.",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
];

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthName(key: string) {
  const month = Number(key.slice(5, 7)) - 1;
  return monthOrder[month] ?? key;
}

function monthLabel(key: string) {
  return `${monthName(key)} ${key.slice(0, 4)}`;
}

function getMonths(entries: FinancialEntry[]) {
  return Array.from(new Set(entries.map((entry) => monthKey(entry.date)))).sort();
}

function addMonths(key: string, amount: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function todayKey() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatFullDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function addDays(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day + amount);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function latestMonth(entries: FinancialEntry[], fallback = todayKey().slice(0, 7)) {
  return getMonths(entries).at(-1) ?? fallback;
}

function monthWindow(entries: FinancialEntry[], size = 6, anchorMonth?: string) {
  const latest = anchorMonth ?? latestMonth(entries);
  return Array.from({ length: size }, (_, index) => addMonths(latest, index - size + 1));
}

function sum(entries: FinancialEntry[], kind: "INCOME" | "EXPENSE") {
  return entries
    .filter((entry) => entry.kind === kind)
    .reduce((total, entry) => total + entry.value, 0);
}

function change(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

export function buildMonthlyFinancial(
  entries: FinancialEntry[],
  anchorMonth?: string,
): MonthlyMetric[] {
  return monthWindow(entries, 6, anchorMonth)
    .map((key) => {
      const monthEntries = entries.filter((entry) => monthKey(entry.date) === key);
      const income = sum(monthEntries, "INCOME");
      const expense = sum(monthEntries, "EXPENSE");

      return {
        month: monthLabel(key),
        income,
        expense,
        profit: income - expense,
      };
    });
}

function buildDailyOperations(dataset: Dataset, size = 14): DailyFleetMetric[] {
  const today = todayKey();
  const days = Array.from({ length: size }, (_, index) => addDays(today, index - size + 1));

  return days.map((day) => {
    const currentMonth = day.slice(0, 7);
    const dayEntries = dataset.financialEntries.filter((entry) => entry.date === day);
    const monthEntriesUntilDay = dataset.financialEntries.filter(
      (entry) => entry.date.startsWith(currentMonth) && entry.date <= day,
    );

    return {
      isoDate: day,
      date: formatFullDate(day),
      vehiclesIn: dataset.vehicles.filter((vehicle) => vehicle.entryDate === day).length,
      vehiclesOut: dataset.vehicles.filter((vehicle) => vehicle.exitDate === day).length,
      dailyRevenue: sum(dayEntries, "INCOME"),
      monthlyRevenue: sum(monthEntriesUntilDay, "INCOME"),
    };
  });
}

function buildFinancialAnalysis(
  entries: FinancialEntry[],
  currentMonth: string,
  currentRevenue: number,
): FinancialAnalysis {
  const previousRevenues = getMonths(entries)
    .filter((key) => key < currentMonth)
    .map((key) => sum(entries.filter((entry) => monthKey(entry.date) === key), "INCOME"))
    .filter((value) => value > 0);
  const monthlyAverage = previousRevenues.length
    ? previousRevenues.reduce((total, value) => total + value, 0) / previousRevenues.length
    : currentRevenue;
  const differencePercent = change(currentRevenue, monthlyAverage);
  const tolerancePercent = 10;
  const status: FinancialAnalysis["status"] =
    Math.abs(differencePercent) <= tolerancePercent
      ? "expected"
      : differencePercent > 0
        ? "above"
        : "below";

  return {
    status,
    monthlyAverage,
    differencePercent,
    tolerancePercent,
  };
}

export function buildTopParts(maintenances: MaintenanceRecord[]) {
  const parts = new Map<string, { name: string; quantity: number; value: number }>();

  maintenances.forEach((maintenance) => {
    maintenance.parts.forEach((part) => {
      const current = parts.get(part.name) ?? {
        name: part.name,
        quantity: 0,
        value: 0,
      };

      current.quantity += part.quantity;
      current.value += part.totalValue;
      parts.set(part.name, current);
    });
  });

  return Array.from(parts.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 6);
}

export function buildVehicleExpenses(entries: FinancialEntry[]) {
  const vehicles = new Map<string, number>();

  entries
    .filter((entry) => entry.kind === "EXPENSE" && entry.vehicleName)
    .forEach((entry) => {
      vehicles.set(entry.vehicleName!, (vehicles.get(entry.vehicleName!) ?? 0) + entry.value);
    });

  return Array.from(vehicles.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export function buildExpenseByCategory(entries: FinancialEntry[]) {
  const categories = new Map<string, number>();

  entries
    .filter((entry) => entry.kind === "EXPENSE")
    .forEach((entry) => {
      categories.set(entry.category, (categories.get(entry.category) ?? 0) + entry.value);
    });

  return Array.from(categories.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function buildMonthlyStockSpend(movements: StockMovement[], anchorMonth?: string) {
  return monthWindow(
    movements.map((movement) => ({
      id: movement.id,
      kind: "EXPENSE" as const,
      category: "Estoque",
      description: movement.partName,
      value: movement.totalValue,
      date: movement.date,
    })),
    6,
    anchorMonth,
  ).map((key) => {
    const monthEntries = movements.filter(
      (movement) => movement.kind === "IN" && monthKey(movement.date) === key,
    );

    return {
      month: monthLabel(key),
      value: monthEntries.reduce((total, item) => total + item.totalValue, 0),
    };
  });
}

function buildStockMovementVolume(movements: StockMovement[], anchorMonth?: string) {
  return monthWindow(
    movements.map((movement) => ({
      id: movement.id,
      kind: "EXPENSE" as const,
      category: "Estoque",
      description: movement.partName,
      value: movement.totalValue,
      date: movement.date,
    })),
    6,
    anchorMonth,
  ).map((key) => {
    const monthEntries = movements.filter((movement) => monthKey(movement.date) === key);

    return {
      month: monthLabel(key),
      entries: monthEntries
        .filter((movement) => movement.kind === "IN")
        .reduce((total, item) => total + item.quantity, 0),
      exits: monthEntries
        .filter((movement) => movement.kind === "OUT")
        .reduce((total, item) => total + item.quantity, 0),
    };
  });
}

function buildPriceComparison(movements: StockMovement[], anchorMonth?: string) {
  return monthWindow(
    movements.map((movement) => ({
      id: movement.id,
      kind: "EXPENSE" as const,
      category: "Estoque",
      description: movement.partName,
      value: movement.unitCost,
      date: movement.date,
    })),
    6,
    anchorMonth,
  ).map((key) => {
    const purchaseEntries = movements.filter(
      (movement) => movement.kind === "IN" && monthKey(movement.date) === key,
    );
    const quantity = purchaseEntries.reduce((total, item) => total + item.quantity, 0);
    const value = quantity
      ? purchaseEntries.reduce((total, item) => total + item.totalValue, 0) / quantity
      : 0;

    return {
      month: monthLabel(key),
      value,
    };
  });
}

function buildMotorcycleUsage(trips: MotorcycleTrip[], motorcycles: ServiceMotorcycle[]) {
  const usage = new Map<string, number>();

  trips.forEach((trip) => {
    usage.set(trip.motorcycleName, (usage.get(trip.motorcycleName) ?? 0) + 1);
  });

  motorcycles.forEach((motorcycle) => {
    const name = `${motorcycle.brand} ${motorcycle.model}`;
    usage.set(name, usage.get(name) ?? 0);
  });

  return Array.from(usage.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function buildMotorcycleTripsByMonth(trips: MotorcycleTrip[], anchorMonth?: string) {
  return monthWindow(
    trips.map((trip) => ({
      id: trip.id,
      kind: "INCOME" as const,
      category: "Motos",
      description: trip.destination,
      value: 1,
      date: trip.departureAt.slice(0, 10),
    })),
    6,
    anchorMonth,
  ).map((key) => ({
    month: monthLabel(key),
    value: trips.filter((trip) => monthKey(trip.departureAt.slice(0, 10)) === key).length,
  }));
}

function buildFinesByMonth(fines: MotorcycleFine[], anchorMonth?: string) {
  return monthWindow(
    fines.map((fine) => ({
      id: fine.id,
      kind: "EXPENSE" as const,
      category: "Multas",
      description: fine.reason,
      value: fine.value,
      date: fine.date,
    })),
    6,
    anchorMonth,
  ).map((key) => ({
    month: monthLabel(key),
    value: fines
      .filter((fine) => monthKey(fine.date) === key)
      .reduce((total, fine) => total + fine.value, 0),
  }));
}

function buildMotorcycleCosts(entries: FinancialEntry[]) {
  const costs = new Map<string, number>();

  entries
    .filter((entry) => entry.kind === "EXPENSE" && entry.serviceMotorcycleName)
    .forEach((entry) => {
      costs.set(
        entry.serviceMotorcycleName!,
        (costs.get(entry.serviceMotorcycleName!) ?? 0) + entry.value,
      );
    });

  return Array.from(costs.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function buildMotorcycleMileageByMonth(
  motorcycles: ServiceMotorcycle[],
  trips: MotorcycleTrip[],
  anchorMonth?: string,
) {
  const averageMileage = motorcycles.length
    ? motorcycles.reduce((total, motorcycle) => total + motorcycle.mileage, 0) / motorcycles.length
    : 0;

  return monthWindow(
    trips.map((trip) => ({
      id: trip.id,
      kind: "INCOME" as const,
      category: "Motos",
      description: trip.destination,
      value: trip.quantityTransported,
      date: trip.departureAt.slice(0, 10),
    })),
    6,
    anchorMonth,
  ).map((key) => ({
    month: monthLabel(key),
    value: Math.round(
      trips.filter((trip) => monthKey(trip.departureAt.slice(0, 10)) === key).length *
        Math.max(12, averageMileage / 900),
    ),
  }));
}

function averageServiceHours(trips: MotorcycleTrip[]) {
  const completed = trips.filter((trip) => trip.returnAt);

  if (!completed.length) {
    return 0;
  }

  const totalHours = completed.reduce((total, trip) => {
    const departure = new Date(trip.departureAt).getTime();
    const returned = new Date(trip.returnAt!).getTime();
    return total + Math.max(0, returned - departure) / 36e5;
  }, 0);

  return Number((totalHours / completed.length).toFixed(1));
}

function daysSince(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function alertStatusClass(value: number, attention: number, critical: number) {
  if (value >= critical) {
    return "critical" as const;
  }

  if (value >= attention) {
    return "attention" as const;
  }

  return "normal" as const;
}

function buildOperationalAlerts(dataset: Dataset, currentEntries: FinancialEntry[]): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const createdAt = new Date().toISOString();

  dataset.partStock.forEach((part) => {
    if (part.quantity <= 0) {
      alerts.push({
        id: `stock-zero-${part.id}`,
        title: "Produto sem estoque",
        description: `${part.name} esta zerado e precisa de reposicao imediata.`,
        module: "Estoque",
        category: "STOCK",
        entityId: part.id,
        targetHref: `/inventory?focus=part:${part.id}`,
        status: "critical",
        priority: "CRITICAL",
        createdAt,
      });
      return;
    }

    if (part.quantity <= part.minQuantity) {
      alerts.push({
        id: `stock-low-${part.id}`,
        title: "Estoque baixo",
        description: `${part.name} esta com ${part.quantity} un. para minimo de ${part.minQuantity}.`,
        module: "Estoque",
        category: "STOCK",
        entityId: part.id,
        targetHref: `/inventory?focus=part:${part.id}`,
        status: part.quantity <= part.minQuantity * 0.5 ? "critical" : "attention",
        priority: part.quantity <= part.minQuantity * 0.5 ? "HIGH" : "MEDIUM",
        createdAt,
      });
    }
  });

  const movementsByPart = new Map<string, StockMovement[]>();
  dataset.stockMovements
    .filter((movement) => movement.kind === "IN")
    .forEach((movement) => {
      movementsByPart.set(movement.partStockId, [
        ...(movementsByPart.get(movement.partStockId) ?? []),
        movement,
      ]);
    });
  movementsByPart.forEach((movements, partId) => {
    const sorted = movements.toSorted((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];
    const previous = sorted[1];
    if (latest && previous && latest.unitCost > previous.unitCost * 1.08) {
      alerts.push({
        id: `cost-increase-${partId}`,
        title: "Aumento de custo de peca",
        description: `${latest.partName} subiu ${Math.round(((latest.unitCost - previous.unitCost) / previous.unitCost) * 100)}% na ultima entrada.`,
        module: "Estoque",
        category: "STOCK_COST",
        entityId: partId,
        targetHref: `/inventory?focus=part:${partId}`,
        status: "attention",
        priority: "MEDIUM",
        createdAt,
      });
    }
  });

  dataset.serviceMotorcycles.forEach((motorcycle) => {
    const lastTrip = dataset.motorcycleTrips
      .filter((trip) => trip.motorcycleId === motorcycle.id)
      .toSorted((a, b) => b.departureAt.localeCompare(a.departureAt))
      .at(0);
    const stoppedDays = lastTrip ? daysSince(lastTrip.returnAt ?? lastTrip.departureAt) : 30;

    if (motorcycle.status === "MAINTENANCE") {
        alerts.push({
          id: `motorcycle-maint-${motorcycle.id}`,
          title: "Moto em manutencao",
          description: `${motorcycle.brand} ${motorcycle.model} (${motorcycle.plate}) em manutencao.`,
          module: "Motos",
          category: "MOTORCYCLE_MAINTENANCE",
          entityId: motorcycle.id,
          targetHref: `/service-motorcycles?focus=motorcycle:${motorcycle.id}`,
          status: "attention",
          priority: "LOW",
          createdAt,
        });
    } else if (stoppedDays > 14) {
      alerts.push({
        id: `motorcycle-stopped-${motorcycle.id}`,
        title: "Moto parada muitos dias",
        description: `${motorcycle.brand} ${motorcycle.model} esta sem giro operacional ha ${stoppedDays} dias.`,
        module: "Motos",
        category: "MOTORCYCLE_STOPPED",
        entityId: motorcycle.id,
        targetHref: `/service-motorcycles?focus=motorcycle:${motorcycle.id}`,
        status: alertStatusClass(stoppedDays, 14, 30),
        priority: stoppedDays > 30 ? "HIGH" : "MEDIUM",
        createdAt,
      });
    }
  });

  dataset.vehicles.forEach((vehicle) => {
    const lastMaintenance = dataset.maintenances
      .filter((maintenance) => maintenance.vehicleId === vehicle.id)
      .toSorted((a, b) => b.date.localeCompare(a.date))
      .at(0);
    const overdueDays = lastMaintenance ? daysSince(lastMaintenance.date) : 120;

    // NOVO: Veículo parado há mais de 90 dias
    if (overdueDays > 90) {
      alerts.push({
        id: `vehicle-stopped-${vehicle.id}`,
        title: "Veiculo parado ha mais de 90 dias",
        description: `${vehicle.name} (${vehicle.plate}) sem movimentacao ou manutencao recente.`,
        module: "Veiculos",
        category: "VEHICLE_STOPPED",
        entityId: vehicle.id,
        targetHref: `/vehicles?focus=vehicle:${vehicle.id}`,
        status: "critical",
        priority: "HIGH",
        createdAt,
      });
    }

    if (vehicle.status === "MAINTENANCE") {
        alerts.push({
          id: `vehicle-maint-${vehicle.id}`,
          title: "Veiculo em manutencao",
          description: `${vehicle.name} esta em servico na oficina.`,
          module: "Manutencao",
          category: "MAINTENANCE",
          entityId: vehicle.id,
          targetHref: `/maintenance?focus=vehicle:${vehicle.id}`,
          status: "attention",
          priority: "LOW",
          createdAt,
        });
    }
  });

  const expensesByVehicle = buildVehicleExpenses(currentEntries);
  const averageVehicleExpense = expensesByVehicle.length
    ? expensesByVehicle.reduce((total, vehicle) => total + vehicle.value, 0) / expensesByVehicle.length
    : 0;
  expensesByVehicle
    .filter((vehicle) => averageVehicleExpense > 0 && vehicle.value > averageVehicleExpense * 1.35)
    .forEach((vehicle) => {
      alerts.push({
        id: `vehicle-expense-${vehicle.name}`,
        title: "Veiculo acima da media",
        description: `${vehicle.name} esta com gastos acima da media da frota no mes.`,
        module: "Financeiro",
        category: "FINANCE",
        entityId: vehicle.name,
        targetHref: "/finance",
        status: "attention",
        priority: "MEDIUM",
        createdAt,
      });
    });

  const averageFuel = dataset.fuelLogs.length
    ? dataset.fuelLogs.reduce((total, fuel) => total + fuel.totalValue, 0) / dataset.fuelLogs.length
    : 0;
  dataset.fuelLogs
    .filter((fuel) => averageFuel > 0 && fuel.totalValue > averageFuel * 1.25)
    .slice(0, 3)
    .forEach((fuel) => {
      alerts.push({
        id: `fuel-high-${fuel.id}`,
        title: "Combustivel acima da media",
        description: `${fuel.vehicleName} registrou abastecimento acima da media em ${fuel.station}.`,
        module: "Combustivel",
        category: "FUEL",
        entityId: fuel.id,
        targetHref: `/fuel?focus=fuel:${fuel.id}`,
        status: "attention",
        priority: "MEDIUM",
        createdAt,
      });
    });

  dataset.motorcycleFines
    .filter(f => f.paymentStatus !== "PAID")
    .forEach((fine) => {
    alerts.push({
      id: `fine-pending-${fine.id}`,
      title: "Multa pendente",
      description: `${fine.motorcyclePlate} possui multa de ${currency(fine.value, dataset.companySettings.currency)} pendente.`,
      module: "Motos",
      category: "FINE",
      entityId: fine.id,
      targetHref: `/service-motorcycles?tab=fines`,
      status: "critical",
      priority: "HIGH",
      createdAt,
    });
  });

  dataset.suppliers.forEach((supplier) => {
    const lastMovement = dataset.stockMovements
      .filter((movement) => movement.supplierId === supplier.id)
      .toSorted((a, b) => b.date.localeCompare(a.date))
      .at(0);
    const inactiveDays = lastMovement ? daysSince(lastMovement.date) : 120;

    if (inactiveDays > 60) {
      alerts.push({
        id: `supplier-inactive-${supplier.id}`,
        title: "Fornecedor sem movimentacao",
        description: `${supplier.name} esta sem compras ha ${inactiveDays} dias.`,
        module: "Fornecedores",
        category: "SUPPLIER",
        entityId: supplier.id,
        targetHref: `/suppliers?focus=supplier:${supplier.id}`,
        status: inactiveDays > 120 ? "critical" : "attention",
        priority: "LOW",
        createdAt,
      });
    }
  });

  return alerts.toSorted((a, b) => {
    const order = { critical: 0, attention: 1, normal: 2 };
    return order[a.status] - order[b.status];
  });
}

function buildAdvancedKpis(
  dataset: Dataset,
  currentEntries: FinancialEntry[],
  current: { income: number; expense: number; profit: number },
): AdvancedKpis {
  const vehicleCount = Math.max(1, dataset.vehicles.length);
  const totalMileage = dataset.vehicles.reduce((total, vehicle) => total + vehicle.mileage, 0);
  const expenses = sum(currentEntries, "EXPENSE");
  const fuelEntries = currentEntries.filter((entry) => entry.category === "CombustÃ­vel");
  const fineEntries = currentEntries.filter((entry) => entry.category === "Multas");
  const mostExpensivePart = dataset.partStock
    .map((part) => ({ name: part.name, value: part.unitCost }))
    .toSorted((a, b) => b.value - a.value)
    .at(0);
  const supplierSpend = new Map<string, number>();
  dataset.stockMovements.forEach((movement) => {
    if (movement.supplierName) {
      supplierSpend.set(
        movement.supplierName,
        (supplierSpend.get(movement.supplierName) ?? 0) + movement.totalValue,
      );
    }
  });
  const topSupplier = Array.from(supplierSpend.entries())
    .map(([name, value]) => ({ name, value }))
    .toSorted((a, b) => b.value - a.value)
    .at(0);
  const mostExpensiveVehicle = buildVehicleExpenses(currentEntries).at(0);

  return {
    averageCostPerVehicle: expenses / vehicleCount,
    costPerKm: totalMileage ? expenses / totalMileage : 0,
    averageFuelCost: fuelEntries.length
      ? fuelEntries.reduce((total, entry) => total + entry.value, 0) / fuelEntries.length
      : 0,
    averageFineCost: fineEntries.length
      ? fineEntries.reduce((total, entry) => total + entry.value, 0) / fineEntries.length
      : 0,
    mostExpensivePart: mostExpensivePart ?? null,
    topSupplier: topSupplier ?? null,
    mostExpensiveVehicle: mostExpensiveVehicle ?? null,
    operationalProfit: current.profit,
  };
}

export function buildDashboardData(dataset: Dataset): DashboardData {
  const currentMonth = todayKey().slice(0, 7);
  const monthlyFinancial = buildMonthlyFinancial(dataset.financialEntries, currentMonth);
  const current = monthlyFinancial.at(-1) ?? { income: 0, expense: 0, profit: 0 };
  const previous = monthlyFinancial.at(-2) ?? { income: 0, expense: 0, profit: 0 };
  const todayEntries = dataset.financialEntries.filter((entry) => entry.date === todayKey());
  const currentEntries = dataset.financialEntries.filter((entry) =>
    entry.date.startsWith(currentMonth),
  );
  const topParts = buildTopParts(dataset.maintenances);
  const inventoryValue = dataset.partStock.reduce(
    (total, part) => total + part.quantity * part.unitCost,
    0,
  );
  const stockCosts = currentEntries
    .filter((entry) => entry.category === "Estoque")
    .reduce((total, entry) => total + entry.value, 0);
  const fineCosts = currentEntries
    .filter((entry) => entry.category === "Multas")
    .reduce((total, entry) => total + entry.value, 0);
  const maintenanceByType = Array.from(
    dataset.maintenances.reduce((types, maintenance) => {
      types.set(maintenance.type, (types.get(maintenance.type) ?? 0) + 1);
      return types;
    }, new Map<string, number>()),
  ).map(([name, value]) => ({ name, value }));
  const maintenanceVehicles = dataset.vehicles
    .filter((vehicle) => vehicle.status === "MAINTENANCE")
    .map((vehicle) => ({
      id: vehicle.id,
      name: vehicle.name,
      model: vehicle.model,
      plate: vehicle.plate,
      driver: vehicle.driver,
      mileage: vehicle.mileage,
    }));

  return {
    metrics: {
      monthlyIncome: current.income,
      dailyIncome: sum(todayEntries, "INCOME"),
      monthlyProfit: current.profit,
      monthlyExpenses: current.expense,
      vehicleCount: dataset.vehicles.length,
      maintenanceCount: maintenanceVehicles.length,
      partsUsed: topParts.reduce((total, part) => total + part.quantity, 0),
      inventoryValue,
      stockCosts,
      fineCosts,
      serviceMotorcycleCount: dataset.serviceMotorcycles.length,
      incomeChange: change(current.income, previous.income),
      profitChange: change(current.profit, previous.profit),
      expenseChange: change(current.expense, previous.expense),
      currentPeriod: monthLabel(currentMonth),
    },
    financialAnalysis: buildFinancialAnalysis(
      dataset.financialEntries,
      currentMonth,
      current.income,
    ),
    maintenanceOverview: {
      count: maintenanceVehicles.length,
      vehicles: maintenanceVehicles,
    },
    dailyOperations: buildDailyOperations(dataset),
    monthlyFinancial,
    vehicleExpenses: buildVehicleExpenses(currentEntries),
    expenseByCategory: buildExpenseByCategory(currentEntries),
    topParts,
    maintenanceByType,
    stockDashboard: {
      mostUsedParts: topParts,
      monthlyPartSpend: buildMonthlyStockSpend(dataset.stockMovements, currentMonth),
      movementsByMonth: buildStockMovementVolume(dataset.stockMovements, currentMonth),
      stockValue: inventoryValue,
      priceComparison: buildPriceComparison(dataset.stockMovements, currentMonth),
    },
    motorcycleDashboard: {
      mostUsed: buildMotorcycleUsage(dataset.motorcycleTrips, dataset.serviceMotorcycles),
      tripsByMonth: buildMotorcycleTripsByMonth(dataset.motorcycleTrips, currentMonth),
      finesByMonth: buildFinesByMonth(dataset.motorcycleFines, currentMonth),
      costsByMotorcycle: buildMotorcycleCosts(currentEntries),
      mileageByMonth: buildMotorcycleMileageByMonth(
        dataset.serviceMotorcycles,
        dataset.motorcycleTrips,
        currentMonth,
      ),
      averageServiceHours: averageServiceHours(dataset.motorcycleTrips),
    },
    recentMaintenances: dataset.maintenances
      .toSorted((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    notifications: dataset.notifications
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
    alerts: buildOperationalAlerts(dataset, currentEntries),
    advancedKpis: buildAdvancedKpis(dataset, currentEntries, current),
    lowStock: dataset.partStock.filter((part) => part.quantity <= part.minQuantity),
  };
}

function inRange(value: string, from?: string, to?: string) {
  return (!from || value >= from) && (!to || value <= to);
}

function filterEntries(
  entries: FinancialEntry[],
  vehicleId?: string,
  from?: string,
  to?: string,
) {
  return entries.filter((entry) => {
    const sameVehicle = !vehicleId || entry.vehicleId === vehicleId;
    return sameVehicle && inRange(entry.date, from, to);
  });
}

export function buildReportData(
  dataset: Dataset,
  options: { vehicleId?: string; from?: string; to?: string; annual?: boolean } = {},
): ReportData {
  const vehicle = dataset.vehicles.find((item) => item.id === options.vehicleId);
  const entries = filterEntries(
    dataset.financialEntries,
    options.vehicleId,
    options.from,
    options.to,
  );
  const maintenances = dataset.maintenances.filter((maintenance) => {
    const sameVehicle = !options.vehicleId || maintenance.vehicleId === options.vehicleId;
    return sameVehicle && inRange(maintenance.date, options.from, options.to);
  });

  return {
    title: options.annual ? "Relatório anual" : "Relatório mensal",
    period: options.annual ? "Ano operacional 2026" : "Período selecionado",
    filters: {
      vehicle: vehicle?.name,
      from: options.from,
      to: options.to,
    },
    totals: {
      income: sum(entries, "INCOME"),
      expenses: sum(entries, "EXPENSE"),
      profit: sum(entries, "INCOME") - sum(entries, "EXPENSE"),
      maintenances: maintenances.reduce((total, item) => total + item.totalValue, 0),
      fuel: entries
        .filter((entry) => entry.category === "Combustível")
        .reduce((total, item) => total + item.value, 0),
      oil: entries
        .filter((entry) => entry.category === "Óleo")
        .reduce((total, item) => total + item.value, 0),
    },
    monthly: buildMonthlyFinancial(entries),
    vehicles: dataset.vehicles
      .map((item) => {
        const vehicleEntries = filterEntries(entries, item.id);
        return {
          name: item.name,
          expense: sum(vehicleEntries, "EXPENSE"),
          maintenances: maintenances.filter((maintenance) => maintenance.vehicleId === item.id)
            .length,
        };
      })
      .filter((item) => item.expense > 0 || item.maintenances > 0)
      .sort((a, b) => b.expense - a.expense),
    parts: buildTopParts(maintenances),
    entries,
  };
}

export function unreadCount(notifications: AppNotification[]) {
  return notifications.filter((notification) => !notification.read).length;
}

export function stockRisk(part: PartStock) {
  if (part.quantity <= part.minQuantity * 0.5) {
    return "Crítico";
  }

  if (part.quantity <= part.minQuantity) {
    return "Baixo";
  }

  return "Seguro";
}
