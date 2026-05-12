import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Prisma } from "@prisma/client";
import { loadLocalDataset, saveLocalDataset } from "@/lib/local-store";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { buildDashboardData, buildReportData } from "@/lib/analytics";
import { inputDate, normalizeCurrencyCode } from "@/lib/format";
import type {
  AppNotification,
  Attachment,
  AttachmentOwnerType,
  BackupRecord,
  CompanySettings,
  DashboardData,
  Dataset,
  FinePaymentHistory,
  FinancialEntry,
  FuelLog,
  MaintenancePart,
  MaintenanceRecord,
  MotorcycleFine,
  MotorcycleTrip,
  OilChange,
  PartStock,
  ReportData,
  ServiceMotorcycle,
  ServiceMotorcycleStatus,
  StockMovement,
  Supplier,
  Vehicle,
  VehicleStatus,
  ActivityLog,
  AuditTrailEntry,
} from "@/lib/types";

let demoDataset = loadLocalDataset();

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.NETLIFY);
const backupDirectory = join(process.cwd(), "data", "backups");
const uploadDirectory = join(process.cwd(), "data", "uploads");

type RequestMeta = {
  ipAddress?: string | null;
  device?: string | null;
};

type ActivityInput = {
  userName: string;
  action: string;
  module: string;
  entityId?: string | null;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown> | null;
} & RequestMeta;

type VehicleInput = {
  name: string;
  model: string;
  plate: string;
  year: number;
  driver: string;
  entryDate: string;
  exitDate?: string | null;
  status: VehicleStatus;
  mileage: number;
};

type MaintenanceInput = {
  vehicleId: string;
  date: string;
  type: string;
  mechanic: string;
  notes?: string | null;
  status: MaintenanceStatus;
  parts: Array<{
    partStockId?: string | null;
    name?: string;
    quantity: number;
    unitValue?: number;
  }>;
};

type OilInput = {
  vehicleId: string;
  oilType: string;
  liters: number;
  valuePerLiter: number;
  date: string;
};

type FuelInput = {
  vehicleId: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  station: string;
  date: string;
};

type FinancialInput = {
  kind: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  value: number;
  date: string;
  vehicleId?: string | null;
  serviceMotorcycleId?: string | null;
};

type SupplierInput = {
  name: string;
  contact: string;
  email: string;
  phone: string;
  document?: string | null;
};

type PartInput = {
  name: string;
  category: string;
  sku: string;
  manufacturer: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  entryDate: string;
  supplierId?: string | null;
  notes?: string | null;
};

type StockEntryInput = {
  partStockId: string;
  quantity: number;
  unitCost: number;
  date: string;
  purchaseDate?: string | null;
  supplierId?: string | null;
  invoiceNumber?: string | null;
  responsibleUser: string;
  notes?: string | null;
};

type ServiceMotorcycleInput = {
  model: string;
  brand: string;
  plate: string;
  year: number;
  mileage: number;
  status: ServiceMotorcycleStatus;
  driver: string;
  photoUrl?: string | null;
  notes?: string | null;
};

type MotorcycleTripInput = {
  motorcycleId: string;
  departureAt: string;
  returnAt?: string | null;
  driver: string;
  destination: string;
  serviceDone: string;
  quantityTransported: number;
  notes?: string | null;
  hasFine?: boolean;
  fineValue?: number;
  fineReason?: string | null;
  fineDate?: string | null;
  fineNotes?: string | null;
};

type MotorcycleFinePaymentInput = {
  paidAmount: number;
  paidBy?: string | null;
  authorizedBy?: string | null;
  paidAt?: string | null;
  paymentNotes?: string | null;
};

function cloneDemo(): Dataset {
  return structuredClone(demoDataset);
}

async function withDb<T>(operation: () => Promise<T>, fallback: () => T | Promise<T>) {
  if (!isDatabaseConfigured()) {
    demoDataset = loadLocalDataset();
    return fallback();
  }

  return operation();
}

function persistLocalDataset() {
  if (!isDatabaseConfigured()) {
    saveLocalDataset(demoDataset);
  }
}

function toVehicle(vehicle: {
  id: string;
  name: string;
  model: string;
  plate: string;
  year: number;
  driver: string;
  entryDate: Date;
  exitDate?: Date | string | null;
  status: string;
  mileage: number;
}): Vehicle {
  return {
    id: vehicle.id,
    name: vehicle.name,
    model: vehicle.model,
    plate: vehicle.plate,
    year: vehicle.year,
    driver: vehicle.driver,
    entryDate: inputDate(vehicle.entryDate),
    exitDate: vehicle.exitDate ? inputDate(vehicle.exitDate) : null,
    status: vehicle.status as VehicleStatus,
    mileage: vehicle.mileage,
  };
}

function getVehicleName(dataset: Dataset, vehicleId?: string | null) {
  return dataset.vehicles.find((vehicle) => vehicle.id === vehicleId)?.name ?? null;
}

function getMotorcycleName(dataset: Dataset, motorcycleId?: string | null) {
  const motorcycle = dataset.serviceMotorcycles.find((item) => item.id === motorcycleId);
  return motorcycle ? `${motorcycle.brand} ${motorcycle.model}` : null;
}

function toPartStock(part: {
  id: string;
  name: string;
  category?: string | null;
  sku: string;
  manufacturer?: string | null;
  quantity: number;
  minQuantity: number;
  unitCost: unknown;
  entryDate?: Date | string | null;
  supplierId?: string | null;
  supplier?: { name: string } | null;
  notes?: string | null;
  stockMovements?: Array<{ date: Date | string; kind: string }>;
}): PartStock {
  const lastEntry = part.stockMovements
    ?.filter((movement) => movement.kind === "IN")
    .toSorted((a, b) => inputDate(b.date).localeCompare(inputDate(a.date)))
    .at(0);

  return {
    id: part.id,
    name: part.name,
    category: part.category ?? "Geral",
    sku: part.sku,
    manufacturer: part.manufacturer ?? "Nao informado",
    quantity: part.quantity,
    minQuantity: part.minQuantity,
    unitCost: Number(part.unitCost),
    entryDate: part.entryDate ? inputDate(part.entryDate) : inputDate(new Date()),
    supplierId: part.supplierId,
    supplierName: part.supplier?.name ?? null,
    notes: part.notes,
    lastEntryDate: lastEntry ? inputDate(lastEntry.date) : null,
  };
}

function toStockMovement(movement: {
  id: string;
  partStockId: string;
  partStock: { name: string };
  kind: string;
  quantity: number;
  unitCost: unknown;
  totalValue: unknown;
  date: Date | string;
  purchaseDate?: Date | string | null;
  supplierId?: string | null;
  supplier?: { name: string } | null;
  invoiceNumber?: string | null;
  responsibleUser: string;
  maintenanceId?: string | null;
  notes?: string | null;
  createdAt: Date | string;
}): StockMovement {
  return {
    id: movement.id,
    partStockId: movement.partStockId,
    partName: movement.partStock.name,
    kind: movement.kind as StockMovement["kind"],
    quantity: movement.quantity,
    unitCost: Number(movement.unitCost),
    totalValue: Number(movement.totalValue),
    date: inputDate(movement.date),
    purchaseDate: movement.purchaseDate ? inputDate(movement.purchaseDate) : null,
    supplierId: movement.supplierId,
    supplierName: movement.supplier?.name ?? null,
    invoiceNumber: movement.invoiceNumber,
    responsibleUser: movement.responsibleUser,
    maintenanceId: movement.maintenanceId,
    notes: movement.notes,
    createdAt: inputDate(movement.createdAt),
  };
}

function toServiceMotorcycle(motorcycle: {
  id: string;
  model: string;
  brand: string;
  plate: string;
  year: number;
  mileage: number;
  status: string;
  driver: string;
  photoUrl?: string | null;
  notes?: string | null;
}): ServiceMotorcycle {
  return {
    id: motorcycle.id,
    model: motorcycle.model,
    brand: motorcycle.brand,
    plate: motorcycle.plate,
    year: motorcycle.year,
    mileage: motorcycle.mileage,
    status: motorcycle.status as ServiceMotorcycleStatus,
    driver: motorcycle.driver,
    photoUrl: motorcycle.photoUrl,
    notes: motorcycle.notes,
  };
}

function finePaymentStatus(value: number, paidAmount: number): MotorcycleFine["paymentStatus"] {
  if (paidAmount >= value && value > 0) {
    return "PAID";
  }

  if (paidAmount > 0) {
    return "PARTIAL";
  }

  return "PENDING";
}

function normalizePaymentHistory(value: unknown): FinePaymentHistory[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is FinePaymentHistory => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: String(item.id ?? randomUUID()),
      paidAmount: Number(item.paidAmount ?? 0),
      paymentStatus:
        item.paymentStatus === "PAID" || item.paymentStatus === "PARTIAL"
          ? item.paymentStatus
          : "PENDING",
      paidBy: item.paidBy ?? null,
      authorizedBy: item.authorizedBy ?? null,
      paidAt: item.paidAt ?? null,
      notes: item.notes ?? null,
      changedBy: String(item.changedBy ?? "Sistema"),
      createdAt: String(item.createdAt ?? new Date().toISOString()),
    }));
}

function toMotorcycleFine(fine: {
  id: string;
  serviceMotorcycleId: string;
  serviceMotorcycle: { brand: string; model: string; plate: string };
  tripId?: string | null;
  value: unknown;
  paidAmount?: unknown;
  paymentStatus?: string | null;
  paidBy?: string | null;
  authorizedBy?: string | null;
  paidAt?: Date | string | null;
  paymentNotes?: string | null;
  paymentHistory?: unknown;
  reason: string;
  date: Date | string;
  notes?: string | null;
}): MotorcycleFine {
  const value = Number(fine.value);
  const paidAmount = Math.max(0, Math.min(value, Number(fine.paidAmount ?? 0)));
  const status = finePaymentStatus(value, paidAmount);

  return {
    id: fine.id,
    motorcycleId: fine.serviceMotorcycleId,
    motorcycleName: `${fine.serviceMotorcycle.brand} ${fine.serviceMotorcycle.model}`,
    motorcyclePlate: fine.serviceMotorcycle.plate,
    tripId: fine.tripId,
    value,
    paidAmount,
    paymentStatus: status,
    paidBy: fine.paidBy ?? null,
    authorizedBy: fine.authorizedBy ?? null,
    paidAt: fine.paidAt ? inputDate(fine.paidAt) : null,
    paymentNotes: fine.paymentNotes ?? null,
    paymentHistory: normalizePaymentHistory(fine.paymentHistory),
    reason: fine.reason,
    date: inputDate(fine.date),
    notes: fine.notes,
  };
}

function toMotorcycleTrip(trip: {
  id: string;
  serviceMotorcycleId: string;
  serviceMotorcycle: { brand: string; model: string; plate: string };
  departureAt: Date | string;
  returnAt?: Date | string | null;
  driver: string;
  destination: string;
  serviceDone: string;
  quantityTransported: number;
  notes?: string | null;
  fine?: Parameters<typeof toMotorcycleFine>[0] | null;
}): MotorcycleTrip {
  return {
    id: trip.id,
    motorcycleId: trip.serviceMotorcycleId,
    motorcycleName: `${trip.serviceMotorcycle.brand} ${trip.serviceMotorcycle.model}`,
    motorcyclePlate: trip.serviceMotorcycle.plate,
    departureAt:
      trip.departureAt instanceof Date
        ? trip.departureAt.toISOString().slice(0, 16)
        : String(trip.departureAt).slice(0, 16),
    returnAt: trip.returnAt
      ? trip.returnAt instanceof Date
        ? trip.returnAt.toISOString().slice(0, 16)
        : String(trip.returnAt).slice(0, 16)
      : null,
    driver: trip.driver,
    destination: trip.destination,
    serviceDone: trip.serviceDone,
    quantityTransported: trip.quantityTransported,
    notes: trip.notes,
    fine: trip.fine ? toMotorcycleFine(trip.fine) : null,
  };
}

function partTotal(part: { quantity: number; unitValue: number }) {
  return Number((part.quantity * part.unitValue).toFixed(2));
}

function normalizeVehicleExitDate(input: Pick<VehicleInput, "status" | "exitDate">) {
  if (input.status !== "INACTIVE") {
    return null;
  }

  return input.exitDate || inputDate(new Date());
}

function financialEntryForExpense(
  category: string,
  description: string,
  value: number,
  date: string,
  vehicle: Vehicle,
): FinancialEntry {
  return {
    id: randomUUID(),
    kind: "EXPENSE",
    category,
    description,
    value,
    date,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
  };
}

function matchLinkedExpense(
  entry: FinancialEntry,
  options: {
    category: string;
    date: string;
    vehicleId?: string | null;
    value: number;
  },
) {
  return (
    entry.kind === "EXPENSE" &&
    entry.category === options.category &&
    entry.date === options.date &&
    entry.vehicleId === options.vehicleId &&
    Math.abs(entry.value - options.value) < 0.01
  );
}

function replaceItem<T extends { id: string }>(items: T[], id: string, next: T) {
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error("Registro não encontrado.");
  }

  items[index] = next;
  return next;
}

function timestampParts(value = new Date()) {
  const iso = value.toISOString();
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
  const [datePart, timePart] = local.split(" ");

  return {
    iso,
    date: datePart ?? iso.slice(0, 10),
    time: (timePart ?? iso.slice(11, 19)).slice(0, 8),
  };
}

function toActivityLog(log: {
  id: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string | null;
  description: string;
  createdAt: Date | string;
  module?: string | null;
  date?: string | null;
  time?: string | null;
  ipAddress?: string | null;
  device?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}): ActivityLog {
  const createdAt = log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt);
  return {
    id: log.id,
    userName: log.userName,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    description: log.description,
    createdAt,
    module: log.module ?? log.entity,
    date: log.date ?? createdAt.slice(0, 10),
    time: log.time ?? (createdAt.includes("T") ? createdAt.slice(11, 19) : "00:00:00"),
    ipAddress: log.ipAddress ?? "127.0.0.1",
    device: log.device ?? "Navegador",
    oldValue: log.oldValue,
    newValue: log.newValue,
    metadata: (log.metadata as Record<string, unknown> | null | undefined) ?? null,
  };
}

function toAuditTrail(entry: {
  id: string;
  userName: string;
  module: string;
  entityId?: string | null;
  summary: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: Date | string;
}): AuditTrailEntry {
  return {
    id: entry.id,
    userName: entry.userName,
    module: entry.module,
    entityId: entry.entityId,
    summary: entry.summary,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt),
  };
}

function toCompanySettings(setting?: Partial<CompanySettings> | null): CompanySettings {
  return {
    cooperativeName: setting?.cooperativeName ?? "CoopFleet",
    logoUrl: setting?.logoUrl ?? "",
    theme: setting?.theme === "system" ? "system" : "premium-dark",
    currency: normalizeCurrencyCode(setting?.currency),
    timezone: setting?.timezone ?? "America/Sao_Paulo",
    backupFrequency:
      setting?.backupFrequency === "weekly" || setting?.backupFrequency === "manual"
        ? setting.backupFrequency
        : "daily",
    backupRetentionDays: Number(setting?.backupRetentionDays ?? 30),
    notificationsEnabled: setting?.notificationsEnabled ?? true,
    sessionTimeoutMinutes: Number(setting?.sessionTimeoutMinutes ?? 480),
  };
}

function backupFileName(type: BackupRecord["type"]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `coopfleet-${type.toLowerCase()}-${stamp}.json`;
}

function writeBackupFile(dataset: Dataset, type: BackupRecord["type"], createdBy: string) {
  const source = isDatabaseConfigured() ? "postgresql" : "local-persistent-store";
  const fileName = backupFileName(type);
  const createdAt = new Date().toISOString();

  if (IS_SERVERLESS) {
    return {
      id: randomUUID(),
      type,
      status: "SUCCESS" as const,
      fileName: `${fileName} (Cloud)`,
      size: 0,
      source,
      createdBy,
      createdAt,
      message: "Backup virtual (disco desativado em nuvem)",
    };
  }

  mkdirSync(backupDirectory, { recursive: true });
  const filePath = join(backupDirectory, fileName);
  const payload = {
    generatedAt: createdAt,
    source,
    type,
    data: dataset,
  };

  writeFileSync(filePath, JSON.stringify(payload, null, 2));
  const size = statSync(filePath).size;

  return {
    id: randomUUID(),
    type,
    status: "SUCCESS" as const,
    fileName,
    size,
    source,
    createdBy,
    createdAt,
    message: null,
  };
}

function pruneLocalBackups(records: BackupRecord[], retentionDays: number) {
  if (IS_SERVERLESS) {
    return records;
  }

  const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const retained: BackupRecord[] = [];

  records.forEach((record) => {
    if (new Date(record.createdAt).getTime() >= threshold) {
      retained.push(record);
      return;
    }

    const path = join(backupDirectory, basename(record.fileName));
    if (existsSync(path)) {
      unlinkSync(path);
    }
  });

  return retained;
}

async function ensureAutomaticBackup(dataset: Dataset) {
  const settings = dataset.companySettings;
  if (settings.backupFrequency === "manual") {
    return;
  }

  const lastAuto = dataset.backupRecords
    .filter((record) => record.type === "AUTO")
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .at(0);
  const now = new Date();
  const last = lastAuto ? new Date(lastAuto.createdAt) : null;
  const due =
    !last ||
    (settings.backupFrequency === "daily" &&
      now.toISOString().slice(0, 10) !== last.toISOString().slice(0, 10)) ||
    (settings.backupFrequency === "weekly" && now.getTime() - last.getTime() > 7 * 24 * 60 * 60 * 1000);

  if (!due) {
    return;
  }

  const record = writeBackupFile(dataset, "AUTO", "Sistema");
  if (isDatabaseConfigured()) {
    await prisma.backupRecord.create({ data: record }).catch(() => null);
    return;
  }

  demoDataset.backupRecords.unshift(record);
  demoDataset.backupRecords = pruneLocalBackups(
    demoDataset.backupRecords,
    settings.backupRetentionDays,
  );
  persistLocalDataset();
}

export async function getNotifications(): Promise<AppNotification[]> {
  return withDb(
    async () => {
      const items = await prisma.notification.findMany({
        include: { vehicle: true },
        orderBy: { createdAt: "desc" },
      });

      return items.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type as NotificationType,
        read: notification.read,
        dueDate: notification.dueDate ? inputDate(notification.dueDate) : null,
        vehicleId: notification.vehicleId,
        vehicleName: notification.vehicle?.name ?? null,
        createdAt: inputDate(notification.createdAt),
      }));
    },
    () => demoDataset.notifications,
  );
}

export async function getSettings(): Promise<CompanySettings> {
  return withDb(
    async () => {
      const setting = await prisma.appSetting.findUnique({ where: { id: "default" } });
      return toCompanySettings(
        setting
          ? {
              cooperativeName: setting.cooperativeName,
              logoUrl: setting.logoUrl,
              theme: setting.theme as CompanySettings["theme"],
              currency: setting.currency,
              timezone: setting.timezone,
              backupFrequency: setting.backupFrequency as CompanySettings["backupFrequency"],
              backupRetentionDays: setting.backupRetentionDays,
              notificationsEnabled: setting.notificationsEnabled,
              sessionTimeoutMinutes: setting.sessionTimeoutMinutes,
            }
          : null,
      );
    },
    () => demoDataset.companySettings,
  );
}

export async function getOilChanges(): Promise<OilChange[]> {
  return withDb(
    async () => {
      const items = await prisma.oilChange.findMany({
        include: { vehicle: true },
        orderBy: { date: "desc" },
      });
      return items.map((oilChange) => ({
        id: oilChange.id,
        vehicleId: oilChange.vehicleId,
        vehicleName: oilChange.vehicle.name,
        oilType: oilChange.oilType,
        liters: Number(oilChange.liters),
        valuePerLiter: Number(oilChange.valuePerLiter),
        totalValue: Number(oilChange.totalValue),
        date: inputDate(oilChange.date),
      }));
    },
    () => demoDataset.oilChanges,
  );
}

export async function getFuelLogs(): Promise<FuelLog[]> {
  return withDb(
    async () => {
      const items = await prisma.fuelLog.findMany({
        include: { vehicle: true },
        orderBy: { date: "desc" },
      });
      return items.map((fuel) => ({
        id: fuel.id,
        vehicleId: fuel.vehicleId,
        vehicleName: fuel.vehicle.name,
        fuelType: fuel.fuelType,
        liters: Number(fuel.liters),
        pricePerLiter: Number(fuel.pricePerLiter),
        totalValue: Number(fuel.totalValue),
        station: fuel.station,
        date: inputDate(fuel.date),
      }));
    },
    () => demoDataset.fuelLogs,
  );
}

export async function getFinanceEntries(): Promise<FinancialEntry[]> {
  return withDb(
    async () => {
      const items = await prisma.financialEntry.findMany({
        include: { vehicle: true, serviceMotorcycle: true },
        orderBy: { date: "desc" },
      });
      return items.map((entry) => ({
        id: entry.id,
        kind: entry.kind as FinancialKind,
        category: entry.category,
        description: entry.description,
        value: Number(entry.value),
        date: inputDate(entry.date),
        vehicleId: entry.vehicleId,
        vehicleName: entry.vehicle?.name ?? null,
        serviceMotorcycleId: entry.serviceMotorcycleId,
        serviceMotorcycleName: entry.serviceMotorcycle
          ? `${entry.serviceMotorcycle.brand} ${entry.serviceMotorcycle.model}`
          : null,
      }));
    },
    () => demoDataset.financialEntries,
  );
}

export async function getStockMovements(): Promise<StockMovement[]> {
  return withDb(
    async () => {
      const items = await prisma.stockMovement.findMany({
        include: { partStock: true, supplier: true },
        orderBy: { date: "desc" },
      });
      return items.map(toStockMovement);
    },
    () => demoDataset.stockMovements,
  );
}

export async function getServiceMotorcycles(): Promise<ServiceMotorcycle[]> {
  return withDb(
    async () => {
      const items = await prisma.serviceMotorcycle.findMany({ orderBy: { createdAt: "desc" } });
      return items.map(toServiceMotorcycle);
    },
    () => demoDataset.serviceMotorcycles,
  );
}

export async function getMotorcycleTrips(): Promise<MotorcycleTrip[]> {
  return withDb(
    async () => {
      const items = await prisma.motorcycleTrip.findMany({
        include: {
          serviceMotorcycle: true,
          fine: { include: { serviceMotorcycle: true } },
        },
        orderBy: { departureAt: "desc" },
      });
      return items.map(toMotorcycleTrip);
    },
    () => demoDataset.motorcycleTrips,
  );
}

export async function getMotorcycleFines(): Promise<MotorcycleFine[]> {
  return withDb(
    async () => {
      const items = await prisma.motorcycleFine.findMany({
        include: { serviceMotorcycle: true },
        orderBy: { date: "desc" },
      });
      return items.map(toMotorcycleFine);
    },
    () => demoDataset.motorcycleFines,
  );
}

export async function getBackupRecords(): Promise<BackupRecord[]> {
  return withDb(
    async () => {
      const items = await prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" } });
      return items.map((record) => ({
        id: record.id,
        type: record.type as BackupRecord["type"],
        status: record.status as BackupRecord["status"],
        fileName: record.fileName,
        size: record.size,
        source: record.source,
        createdBy: record.createdBy,
        createdAt: record.createdAt.toISOString(),
        message: record.message,
      }));
    },
    () => demoDataset.backupRecords,
  );
}

export async function getSuppliers(): Promise<Supplier[]> {
  return withDb(
    async () => {
      const items = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
      return items.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        contact: supplier.contact,
        email: supplier.email,
        phone: supplier.phone,
        document: supplier.document,
      }));
    },
    () => demoDataset.suppliers,
  );
}

export async function getInventory() {
  return withDb(
    async () => {
      const [partStock, suppliers] = await Promise.all([
        prisma.partStock.findMany({
          where: { deletedAt: null },
          include: {
            supplier: true,
            stockMovements: {
              orderBy: { date: "desc" },
              take: 1,
            },
          },
          orderBy: { name: "asc" },
        }),
        prisma.supplier.findMany({ orderBy: { name: "asc" } }),
      ]);

      return {
        partStock: partStock.map(toPartStock),
        suppliers: suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          contact: supplier.contact,
          email: supplier.email,
          phone: supplier.phone,
          document: supplier.document,
        })),
      };
    },
    () => ({
      partStock: demoDataset.partStock,
      suppliers: demoDataset.suppliers,
    }),
  );
}

export async function getMaintenances(): Promise<MaintenanceRecord[]> {
  return withDb(
    async () => {
      const records = await prisma.maintenance.findMany({
        include: {
          vehicle: true,
          parts: true,
        },
        orderBy: { date: "desc" },
      });

      return records.map((maintenance) => ({
        id: maintenance.id,
        vehicleId: maintenance.vehicleId,
        vehicleName: maintenance.vehicle.name,
        date: inputDate(maintenance.date),
        type: maintenance.type,
        mechanic: maintenance.mechanic,
        notes: maintenance.notes,
        totalValue: Number(maintenance.totalValue),
        status: maintenance.status as MaintenanceStatus,
        concludedAt: maintenance.concludedAt ? maintenance.concludedAt.toISOString() : null,
        concludedBy: maintenance.concludedBy,
        parts: maintenance.parts.map((part) => ({
          id: part.id,
          partStockId: part.partStockId,
          name: part.name,
          quantity: part.quantity,
          unitValue: Number(part.unitValue),
          totalValue: Number(part.totalValue),
        })),
      }));
    },
    () => demoDataset.maintenances,
  );
}

export async function getVehicles(): Promise<Vehicle[]> {
  return withDb(
    async () => {
      const vehicles = await prisma.vehicle.findMany({ orderBy: { createdAt: "desc" } });
      return vehicles.map(toVehicle);
    },
    () => demoDataset.vehicles,
  );
}

export async function getDataset(): Promise<Dataset> {
  return withDb(
    async () => {
      const [
        vehicles,
        maintenances,
        oilChanges,
        financialEntries,
        suppliers,
        partStock,
        stockMovements,
        fuelLogs,
        notifications,
        serviceMotorcycles,
        motorcycleTrips,
        motorcycleFines,
        activityLogs,
        auditTrail,
        attachments,
        deletedItems,
        backupRecords,
        appSetting,
      ] = await Promise.all([
        prisma.vehicle.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.maintenance.findMany({
          include: {
            vehicle: true,
            parts: true,
          },
          orderBy: { date: "desc" },
        }),
        prisma.oilChange.findMany({
          include: { vehicle: true },
          orderBy: { date: "desc" },
        }),
        prisma.financialEntry.findMany({
          include: { vehicle: true, serviceMotorcycle: true },
          orderBy: { date: "desc" },
        }),
        prisma.supplier.findMany({ orderBy: { name: "asc" } }),
        prisma.partStock.findMany({
          where: { deletedAt: null },
          include: {
            supplier: true,
            stockMovements: {
              orderBy: { date: "desc" },
              take: 1,
            },
          },
          orderBy: { name: "asc" },
        }),
        prisma.stockMovement.findMany({
          include: { partStock: true, supplier: true },
          orderBy: { date: "desc" },
        }),
        prisma.fuelLog.findMany({
          include: { vehicle: true },
          orderBy: { date: "desc" },
        }),
        prisma.notification.findMany({
          include: { vehicle: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.serviceMotorcycle.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.motorcycleTrip.findMany({
          include: {
            serviceMotorcycle: true,
            fine: { include: { serviceMotorcycle: true } },
          },
          orderBy: { departureAt: "desc" },
        }),
        prisma.motorcycleFine.findMany({
          include: { serviceMotorcycle: true },
          orderBy: { date: "desc" },
        }),
        prisma.activityLog.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.auditTrail.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.attachment.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.deletedItem.findMany({ orderBy: { deletedAt: "desc" } }),
        prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.appSetting.findUnique({ where: { id: "default" } }),
      ]);

      return {
        users: [],
        vehicles: vehicles.map(toVehicle),
        maintenances: maintenances.map((maintenance) => ({
          id: maintenance.id,
          vehicleId: maintenance.vehicleId,
          vehicleName: maintenance.vehicle.name,
          date: inputDate(maintenance.date),
          type: maintenance.type,
          mechanic: maintenance.mechanic,
          notes: maintenance.notes,
          totalValue: Number(maintenance.totalValue),
          status: maintenance.status as MaintenanceStatus,
          concludedAt: maintenance.concludedAt ? maintenance.concludedAt.toISOString() : null,
          concludedBy: maintenance.concludedBy,
          parts: maintenance.parts.map((part) => ({
            id: part.id,
            partStockId: part.partStockId,
            name: part.name,
            quantity: part.quantity,
            unitValue: Number(part.unitValue),
            totalValue: Number(part.totalValue),
          })),
        })),
        oilChanges: oilChanges.map((oilChange) => ({
          id: oilChange.id,
          vehicleId: oilChange.vehicleId,
          vehicleName: oilChange.vehicle.name,
          oilType: oilChange.oilType,
          liters: Number(oilChange.liters),
          valuePerLiter: Number(oilChange.valuePerLiter),
          totalValue: Number(oilChange.totalValue),
          date: inputDate(oilChange.date),
        })),
        financialEntries: financialEntries.map((entry) => ({
          id: entry.id,
          kind: entry.kind,
          category: entry.category,
          description: entry.description,
          value: Number(entry.value),
          date: inputDate(entry.date),
          vehicleId: entry.vehicleId,
          vehicleName: entry.vehicle?.name ?? null,
          serviceMotorcycleId: entry.serviceMotorcycleId,
          serviceMotorcycleName: entry.serviceMotorcycle
            ? `${entry.serviceMotorcycle.brand} ${entry.serviceMotorcycle.model}`
            : null,
        })),
        suppliers: suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          contact: supplier.contact,
          email: supplier.email,
          phone: supplier.phone,
          document: supplier.document,
        })),
        partStock: partStock.map(toPartStock),
        stockMovements: stockMovements.map(toStockMovement),
        fuelLogs: fuelLogs.map((fuel) => ({
          id: fuel.id,
          vehicleId: fuel.vehicleId,
          vehicleName: fuel.vehicle.name,
          fuelType: fuel.fuelType,
          liters: Number(fuel.liters),
          pricePerLiter: Number(fuel.pricePerLiter),
          totalValue: Number(fuel.totalValue),
          station: fuel.station,
          date: inputDate(fuel.date),
        })),
        notifications: notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: notification.read,
          dueDate: notification.dueDate ? inputDate(notification.dueDate) : null,
          vehicleId: notification.vehicleId,
          vehicleName: notification.vehicle?.name ?? null,
          createdAt: inputDate(notification.createdAt),
        })),
        serviceMotorcycles: serviceMotorcycles.map(toServiceMotorcycle),
        motorcycleTrips: motorcycleTrips.map(toMotorcycleTrip),
        motorcycleFines: motorcycleFines.map(toMotorcycleFine),
        activityLogs: activityLogs.map(toActivityLog),
        auditTrail: auditTrail.map(toAuditTrail),
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          ownerType: attachment.ownerType as AttachmentOwnerType,
          ownerId: attachment.ownerId,
          ownerLabel: attachment.ownerLabel,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          fileSize: attachment.fileSize,
          url: attachment.url,
          uploadedBy: attachment.uploadedBy,
          description: attachment.description ?? null,
          module: attachment.module ?? attachment.ownerType,
          vehicleId: attachment.vehicleId,
          maintenanceId: attachment.maintenanceId,
          oilChangeId: attachment.oilChangeId,
          fuelLogId: attachment.fuelLogId,
          supplierId: attachment.supplierId,
          partStockId: attachment.partStockId,
          serviceMotorcycleId: attachment.serviceMotorcycleId,
          motorcycleFineId: attachment.motorcycleFineId,
          createdAt: attachment.createdAt.toISOString(),
        })),
        deletedItems: deletedItems.map((item) => ({
          id: item.id,
          entity: item.entity,
          entityId: item.entityId,
          label: item.label,
          payload: item.payload,
          deletedBy: item.deletedBy,
          deletedAt: item.deletedAt.toISOString(),
          restoredAt: item.restoredAt?.toISOString() ?? null,
          permanentlyDeletedAt: item.permanentlyDeletedAt?.toISOString() ?? null,
        })),
        backupRecords: backupRecords.map((record) => ({
          id: record.id,
          type: record.type as BackupRecord["type"],
          status: record.status as BackupRecord["status"],
          fileName: record.fileName,
          size: record.size,
          source: record.source,
          createdBy: record.createdBy,
          createdAt: record.createdAt.toISOString(),
          message: record.message,
        })),
        companySettings: toCompanySettings(
          appSetting
            ? {
                cooperativeName: appSetting.cooperativeName,
                logoUrl: appSetting.logoUrl,
                theme: appSetting.theme as CompanySettings["theme"],
                currency: appSetting.currency,
                timezone: appSetting.timezone,
                backupFrequency: appSetting.backupFrequency as CompanySettings["backupFrequency"],
                backupRetentionDays: appSetting.backupRetentionDays,
                notificationsEnabled: appSetting.notificationsEnabled,
                sessionTimeoutMinutes: appSetting.sessionTimeoutMinutes,
              }
            : null,
        ),
      };
    },
    cloneDemo,
  );
}

export async function getDashboard(): Promise<DashboardData> {
  const dataset = await getDataset();
  await ensureAutomaticBackup(dataset);
  return buildDashboardData(dataset);
}

export async function getReport(options: {
  vehicleId?: string;
  from?: string;
  to?: string;
  annual?: boolean;
}): Promise<ReportData> {
  return buildReportData(await getDataset(), options);
}

export async function recordActivity(input: ActivityInput) {
  const parts = timestampParts();
  const log: ActivityLog = {
    id: randomUUID(),
    userName: input.userName,
    action: input.action,
    entity: input.module,
    entityId: input.entityId ?? null,
    description: input.description,
    createdAt: parts.iso,
    module: input.module,
    date: parts.date,
    time: parts.time,
    ipAddress: input.ipAddress ?? "127.0.0.1",
    device: input.device ?? "Navegador",
    oldValue: input.oldValue,
    newValue: input.newValue,
    metadata: input.metadata ?? null,
  };
  const audit: AuditTrailEntry | null =
    input.oldValue !== undefined || input.newValue !== undefined
      ? {
          id: randomUUID(),
          userName: input.userName,
          module: input.module,
          entityId: input.entityId ?? null,
          summary: input.description,
          oldValue: input.oldValue,
          newValue: input.newValue,
          createdAt: parts.iso,
        }
      : null;

  return withDb(
    async () => {
      const saved = await prisma.activityLog.create({
        data: {
          userName: log.userName,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          description: log.description,
          module: log.module,
          date: log.date,
          time: log.time,
          ipAddress: log.ipAddress,
          device: log.device,
          oldValue:
            log.oldValue === undefined ? undefined : (log.oldValue as Prisma.InputJsonValue),
          newValue:
            log.newValue === undefined ? undefined : (log.newValue as Prisma.InputJsonValue),
          metadata: log.metadata ? (log.metadata as Prisma.InputJsonValue) : undefined,
        },
      });

      if (audit) {
        await prisma.auditTrail.create({
          data: {
            userName: audit.userName,
            module: audit.module,
            entityId: audit.entityId,
            summary: audit.summary,
            oldValue:
              audit.oldValue === undefined
                ? undefined
                : (audit.oldValue as Prisma.InputJsonValue),
            newValue:
              audit.newValue === undefined
                ? undefined
                : (audit.newValue as Prisma.InputJsonValue),
          },
        });
      }

      return toActivityLog(saved);
    },
    () => {
      demoDataset.activityLogs.unshift(log);
      if (audit) {
        demoDataset.auditTrail.unshift(audit);
      }
      persistLocalDataset();
      return log;
    },
  );
}

export async function createVehicle(input: VehicleInput) {
  return withDb(
    async () => {
      const exitDate = normalizeVehicleExitDate(input);
      const vehicle = await prisma.vehicle.create({
        data: {
          name: input.name,
          model: input.model,
          plate: input.plate.toUpperCase(),
          year: input.year,
          driver: input.driver,
          entryDate: new Date(input.entryDate),
          exitDate: exitDate ? new Date(exitDate) : null,
          status: input.status,
          mileage: input.mileage,
        },
      });

      return toVehicle(vehicle);
    },
    () => {
      const vehicle: Vehicle = {
        id: randomUUID(),
        ...input,
        plate: input.plate.toUpperCase(),
        exitDate: normalizeVehicleExitDate(input),
      };
      demoDataset.vehicles.unshift(vehicle);
      persistLocalDataset();
      return vehicle;
    },
  );
}

export async function updateVehicle(id: string, input: VehicleInput) {
  return withDb(
    async () => {
      const exitDate = normalizeVehicleExitDate(input);
      const existing = await prisma.vehicle.findUnique({ where: { id } });

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          name: input.name,
          model: input.model,
          plate: input.plate.toUpperCase(),
          year: input.year,
          driver: input.driver,
          entryDate: new Date(input.entryDate),
          exitDate: exitDate ? new Date(exitDate) : null,
          status: input.status,
          mileage: input.mileage,
        },
      });

      if (input.status === "MAINTENANCE" && existing?.status !== "MAINTENANCE") {
        await createMaintenance({
          vehicleId: id,
          date: new Date().toISOString().slice(0, 10),
          type: "Preventiva",
          mechanic: "A definir",
          status: "ONGOING",
          parts: [],
        }).catch(() => null);
      }

      return toVehicle(vehicle);
    },
    () => {
      const current = demoDataset.vehicles.find((vehicle) => vehicle.id === id);

      if (!current) {
        throw new Error("Veículo não encontrado.");
      }

      const prevStatus = current.status;
      const vehicle: Vehicle = {
        id,
        ...input,
        plate: input.plate.toUpperCase(),
        exitDate: normalizeVehicleExitDate(input),
      };

      if (input.status === "MAINTENANCE" && prevStatus !== "MAINTENANCE") {
        createMaintenance({
          vehicleId: id,
          date: new Date().toISOString().slice(0, 10),
          type: "Preventiva",
          mechanic: "A definir",
          status: "ONGOING",
          parts: [],
        }).catch(() => null);
      }

      demoDataset.maintenances.forEach((maintenance) => {
        if (maintenance.vehicleId === id) {
          maintenance.vehicleName = vehicle.name;
        }
      });
      demoDataset.oilChanges.forEach((oilChange) => {
        if (oilChange.vehicleId === id) {
          oilChange.vehicleName = vehicle.name;
        }
      });
      demoDataset.fuelLogs.forEach((fuel) => {
        if (fuel.vehicleId === id) {
          fuel.vehicleName = vehicle.name;
        }
      });
      demoDataset.financialEntries.forEach((entry) => {
        if (entry.vehicleId === id) {
          entry.vehicleName = vehicle.name;
        }
      });

      const updated = replaceItem(demoDataset.vehicles, id, vehicle);
      persistLocalDataset();
      return updated;
    },
  );
}

export async function updateMaintenanceStatus(id: string, status: MaintenanceStatus) {
  return withDb(
    async () => {
      const maintenance = await prisma.maintenance.update({
        where: { id },
        data: { status },
      });

      return { id, status: maintenance.status as MaintenanceStatus };
    },
    () => {
      const maintenance = demoDataset.maintenances.find((m) => m.id === id);
      if (maintenance) {
        maintenance.status = status;
      }
      return { id, status };
    },
  );
}

export async function concludeMaintenance(id: string, userName: string) {
  return withDb(
    async () => {
      const maintenance = await prisma.maintenance.update({
        where: { id },
        data: {
          status: "CONCLUDED",
          concludedAt: new Date(),
          concludedBy: userName,
        },
      });

      await prisma.vehicle.update({
        where: { id: maintenance.vehicleId },
        data: { status: "ACTIVE" },
      });

      return {
        id,
        status: "CONCLUDED" as const,
        concludedAt: maintenance.concludedAt?.toISOString(),
        concludedBy: userName,
      };
    },
    () => {
      const maintenance = demoDataset.maintenances.find((m) => m.id === id);
      if (!maintenance) throw new Error("Manutenção não encontrada.");

      maintenance.status = "CONCLUDED";
      maintenance.concludedAt = new Date().toISOString();
      maintenance.concludedBy = userName;

      const vehicle = demoDataset.vehicles.find((v) => v.id === maintenance.vehicleId);
      if (vehicle) vehicle.status = "ACTIVE";

      persistLocalDataset();
      return {
        id,
        status: "CONCLUDED" as const,
        concludedAt: maintenance.concludedAt,
        concludedBy: userName,
      };
    },
  );
}

export async function createMaintenance(input: MaintenanceInput) {
  return withDb(
    async () => {
      const vehicle = await prisma.vehicle.findUniqueOrThrow({
        where: { id: input.vehicleId },
      });
      const stockIds = input.parts.map((part) => part.partStockId).filter(Boolean) as string[];
      const stockItems = await prisma.partStock.findMany({
        where: { id: { in: stockIds } },
      });
      const parts = input.parts.map((part) => {
        const stock = stockItems.find((item) => item.id === part.partStockId);

        if (!stock) {
          throw new Error("Selecione uma peca cadastrada no estoque.");
        }

        if (stock.quantity < part.quantity) {
          throw new Error(`Estoque insuficiente para ${stock.name}. Disponivel: ${stock.quantity}.`);
        }

        const unitValue = Number(stock.unitCost);
        return {
          partStockId: stock.id,
          name: stock.name,
          quantity: part.quantity,
          unitValue,
          totalValue: partTotal({ quantity: part.quantity, unitValue }),
        };
      });
      const totalValue = parts.reduce((total, part) => total + part.totalValue, 0);

      return prisma.$transaction(async (transaction) => {
        const maintenance = await transaction.maintenance.create({
          data: {
            vehicleId: input.vehicleId,
            date: new Date(input.date),
            type: input.type,
            mechanic: input.mechanic,
            notes: input.notes,
            totalValue,
            status: input.status,
            parts: {
              create: parts.map((part) => ({
                partStockId: part.partStockId || null,
                name: part.name ?? "Peca",
                quantity: part.quantity,
                unitValue: part.unitValue,
                totalValue: part.totalValue,
              })),
            },
          },
          include: { parts: true },
        });

        await Promise.all(
          parts.map((part) =>
            transaction.partStock.update({
              where: { id: part.partStockId },
              data: { quantity: { decrement: part.quantity } },
            }),
          ),
        );

        await Promise.all(
          parts.map((part) =>
            transaction.stockMovement.create({
              data: {
                partStockId: part.partStockId,
                kind: "OUT",
                quantity: part.quantity,
                unitCost: part.unitValue,
                totalValue: part.totalValue,
                date: new Date(input.date),
                responsibleUser: input.mechanic,
                maintenanceId: maintenance.id,
                notes: `Saida para manutencao ${input.type}`,
              },
            }),
          ),
        );

        await transaction.financialEntry.create({
          data: {
            kind: "EXPENSE",
            category: "Manutenção",
            description: `${input.type} - ${vehicle.name}`,
            value: totalValue,
            date: new Date(input.date),
            vehicleId: input.vehicleId,
          },
        });

        const isFinished = input.status === "CONCLUDED" || input.status === "CANCELED";
        await transaction.vehicle.update({
          where: { id: input.vehicleId },
          data: { status: isFinished ? "ACTIVE" : "MAINTENANCE" },
        });

        return {
          id: maintenance.id,
          vehicleId: input.vehicleId,
          vehicleName: vehicle.name,
          date: input.date,
          type: maintenance.type,
          mechanic: maintenance.mechanic,
          notes: maintenance.notes,
          totalValue,
          status: maintenance.status as MaintenanceStatus,
          concludedAt: maintenance.concludedAt ? maintenance.concludedAt.toISOString() : null,
          concludedBy: maintenance.concludedBy,
          parts: maintenance.parts.map((part) => ({
            id: part.id,
            partStockId: part.partStockId,
            name: part.name,
            quantity: part.quantity,
            unitValue: Number(part.unitValue),
            totalValue: Number(part.totalValue),
          })),
        } satisfies MaintenanceRecord;
      });
    },
    () => {
      const vehicle = demoDataset.vehicles.find((item) => item.id === input.vehicleId);

      if (!vehicle) {
        throw new Error("Veículo não encontrado.");
      }

      const parts: MaintenancePart[] = input.parts.map((part) => {
        const stock = demoDataset.partStock.find((item) => item.id === part.partStockId);

        if (!stock) {
          throw new Error("Selecione uma peca cadastrada no estoque.");
        }

        if (stock.quantity < part.quantity) {
          throw new Error(`Estoque insuficiente para ${stock.name}. Disponivel: ${stock.quantity}.`);
        }

        stock.quantity -= part.quantity;

        return {
          id: randomUUID(),
          partStockId: stock.id,
          name: part.name || stock?.name || "Peça avulsa",
          quantity: part.quantity,
          unitValue: stock.unitCost,
          totalValue: partTotal({ quantity: part.quantity, unitValue: stock.unitCost }),
        };
      });
      const totalValue = parts.reduce((total, part) => total + part.totalValue, 0);
      const isFinished = input.status === "CONCLUDED" || input.status === "CANCELED";

      const maintenance: MaintenanceRecord = {
        id: randomUUID(),
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        date: input.date,
        type: input.type,
        mechanic: input.mechanic,
        notes: input.notes,
        totalValue,
        status: input.status,
        concludedAt: isFinished ? new Date().toISOString() : null,
        concludedBy: isFinished ? "Sistema" : null,
        parts,
      };

      vehicle.status = isFinished ? "ACTIVE" : "MAINTENANCE";
      demoDataset.maintenances.unshift(maintenance);
      parts.forEach((part) => {
        demoDataset.stockMovements.unshift({
          id: randomUUID(),
          partStockId: part.partStockId!,
          partName: part.name,
          kind: "OUT",
          quantity: part.quantity,
          unitCost: part.unitValue,
          totalValue: part.totalValue,
          date: input.date,
          responsibleUser: input.mechanic,
          maintenanceId: maintenance.id,
          notes: `Saida para manutencao ${input.type}`,
          createdAt: input.date,
        });
      });
      demoDataset.financialEntries.unshift(
        financialEntryForExpense(
          "Manutenção",
          `${input.type} - ${vehicle.name}`,
          totalValue,
          input.date,
          vehicle,
        ),
      );
      persistLocalDataset();
      return maintenance;
    },
  );
}

export async function updateMaintenance(id: string, input: MaintenanceInput) {
  return withDb(
    async () => {
      const parts = input.parts.map((part) => ({
        ...part,
        unitValue: part.unitValue ?? 0,
        totalValue: partTotal({ quantity: part.quantity, unitValue: part.unitValue ?? 0 }),
      }));
      let totalValue = parts.reduce((total, part) => total + part.totalValue, 0);

      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.maintenance.findUniqueOrThrow({
          where: { id },
          include: { parts: true, vehicle: true },
        });
        const vehicle = await transaction.vehicle.findUniqueOrThrow({
          where: { id: input.vehicleId },
        });

        await Promise.all(
          existing.parts
            .filter((part) => part.partStockId)
            .map((part) =>
              transaction.partStock.update({
                where: { id: part.partStockId! },
                data: { quantity: { increment: part.quantity } },
              }),
            ),
        );
        const stockItems = await transaction.partStock.findMany({
          where: {
            id: {
              in: parts.map((part) => part.partStockId).filter(Boolean) as string[],
            },
          },
        });

        parts.forEach((part) => {
          const stock = stockItems.find((item) => item.id === part.partStockId);

          if (!stock) {
            throw new Error("Selecione uma peca cadastrada no estoque.");
          }

          if (stock.quantity < part.quantity) {
            throw new Error(`Estoque insuficiente para ${stock.name}. Disponivel: ${stock.quantity}.`);
          }

          part.name = stock.name;
          part.unitValue = Number(stock.unitCost);
          part.totalValue = partTotal({ quantity: part.quantity, unitValue: part.unitValue });
        });
        totalValue = parts.reduce((total, part) => total + part.totalValue, 0);
        await Promise.all(
          parts
            .filter((part) => part.partStockId)
            .map((part) =>
              transaction.partStock.update({
                where: { id: part.partStockId! },
                data: { quantity: { decrement: part.quantity } },
              }),
            ),
        );
        await Promise.all(
          parts.map((part) =>
            transaction.stockMovement.create({
              data: {
                partStockId: part.partStockId!,
                kind: "OUT",
                quantity: part.quantity,
                unitCost: part.unitValue,
                totalValue: part.totalValue,
                date: new Date(input.date),
                responsibleUser: input.mechanic,
                maintenanceId: id,
                notes: `Atualizacao de manutencao ${input.type}`,
              },
            }),
          ),
        );

        const maintenance = await transaction.maintenance.update({
          where: { id },
          data: {
            vehicleId: input.vehicleId,
            date: new Date(input.date),
            type: input.type,
            mechanic: input.mechanic,
            notes: input.notes,
            totalValue,
            status: input.status,
            concludedAt: (input.status === "CONCLUDED" || input.status === "CANCELED") ? new Date() : null,
            concludedBy: (input.status === "CONCLUDED" || input.status === "CANCELED") ? "Admin" : null,
            parts: {
              deleteMany: {},
              create: parts.map((part) => ({
                partStockId: part.partStockId || null,
                name: part.name ?? "Peca",
                quantity: part.quantity,
                unitValue: part.unitValue,
                totalValue: part.totalValue,
              })),
            },
          },
          include: { parts: true },
        });

        const isFinished = input.status === "CONCLUDED" || input.status === "CANCELED";
        await transaction.vehicle.update({
          where: { id: input.vehicleId },
          data: { status: isFinished ? "ACTIVE" : "MAINTENANCE" },
        });

        const linkedEntry = await transaction.financialEntry.findFirst({
          where: {
            kind: "EXPENSE",
            category: "Manutenção",
            vehicleId: existing.vehicleId,
            date: existing.date,
            value: existing.totalValue,
          },
          orderBy: { createdAt: "desc" },
        });

        const financialData = {
          kind: "EXPENSE" as const,
          category: "Manutenção",
          description: `${input.type} - ${vehicle.name}`,
          value: totalValue,
          date: new Date(input.date),
          vehicleId: input.vehicleId,
        };

        if (linkedEntry) {
          await transaction.financialEntry.update({
            where: { id: linkedEntry.id },
            data: financialData,
          });
        } else {
          await transaction.financialEntry.create({ data: financialData });
        }

        return {
          id: maintenance.id,
          vehicleId: input.vehicleId,
          vehicleName: vehicle.name,
          date: input.date,
          type: maintenance.type,
          mechanic: maintenance.mechanic,
          notes: maintenance.notes,
          totalValue,
          status: maintenance.status as MaintenanceStatus,
          concludedAt: maintenance.concludedAt ? maintenance.concludedAt.toISOString() : null,
          concludedBy: maintenance.concludedBy,
          parts: maintenance.parts.map((part) => ({
            id: part.id,
            partStockId: part.partStockId,
            name: part.name,
            quantity: part.quantity,
            unitValue: Number(part.unitValue),
            totalValue: Number(part.totalValue),
          })),
        } satisfies MaintenanceRecord;
      });
    },
    () => {
      const existing = demoDataset.maintenances.find((maintenance) => maintenance.id === id);
      const vehicle = demoDataset.vehicles.find((item) => item.id === input.vehicleId);

      if (!existing || !vehicle) {
        throw new Error("Registro não encontrado.");
      }

      existing.parts.forEach((part) => {
        const stock = demoDataset.partStock.find((item) => item.id === part.partStockId);
        if (stock) {
          stock.quantity += part.quantity;
        }
      });

      const parts: MaintenancePart[] = input.parts.map((part) => {
        const stock = demoDataset.partStock.find((item) => item.id === part.partStockId);

        if (!stock) {
          throw new Error("Selecione uma peca cadastrada no estoque.");
        }

        if (stock.quantity < part.quantity) {
          throw new Error(`Estoque insuficiente para ${stock.name}. Disponivel: ${stock.quantity}.`);
        }

        stock.quantity -= part.quantity;

        return {
          id: randomUUID(),
          partStockId: stock.id,
          name: part.name || stock?.name || "Peça avulsa",
          quantity: part.quantity,
          unitValue: stock.unitCost,
          totalValue: partTotal({ quantity: part.quantity, unitValue: stock.unitCost }),
        };
      });
      const totalValue = parts.reduce((total, part) => total + part.totalValue, 0);
      const isFinished = input.status === "CONCLUDED" || input.status === "CANCELED";
      const next: MaintenanceRecord = {
        id,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        date: input.date,
        type: input.type,
        mechanic: input.mechanic,
        notes: input.notes,
        totalValue,
        status: input.status,
        concludedAt: isFinished ? new Date().toISOString() : null,
        concludedBy: isFinished ? "Admin" : null,
        parts,
      };

      vehicle.status = isFinished ? "ACTIVE" : "MAINTENANCE";

      const linkedEntry = demoDataset.financialEntries.find((entry) =>
        matchLinkedExpense(entry, {
          category: "Manutenção",
          date: existing.date,
          vehicleId: existing.vehicleId,
          value: existing.totalValue,
        }),
      );

      if (linkedEntry) {
        linkedEntry.description = `${input.type} - ${vehicle.name}`;
        linkedEntry.value = totalValue;
        linkedEntry.date = input.date;
        linkedEntry.vehicleId = vehicle.id;
        linkedEntry.vehicleName = vehicle.name;
      } else {
        demoDataset.financialEntries.unshift(
          financialEntryForExpense(
            "Manutenção",
            `${input.type} - ${vehicle.name}`,
            totalValue,
            input.date,
            vehicle,
          ),
        );
      }

      parts.forEach((part) => {
        demoDataset.stockMovements.unshift({
          id: randomUUID(),
          partStockId: part.partStockId!,
          partName: part.name,
          kind: "OUT",
          quantity: part.quantity,
          unitCost: part.unitValue,
          totalValue: part.totalValue,
          date: input.date,
          responsibleUser: input.mechanic,
          maintenanceId: id,
          notes: `Atualizacao de manutencao ${input.type}`,
          createdAt: input.date,
        });
      });
      const updated = replaceItem(demoDataset.maintenances, id, next);
      persistLocalDataset();
      return updated;
    },
  );
}

export async function createOilChange(input: OilInput) {
  return withDb(
    async () => {
      const vehicle = await prisma.vehicle.findUniqueOrThrow({
        where: { id: input.vehicleId },
      });
      const totalValue = Number((input.liters * input.valuePerLiter).toFixed(2));

      return prisma.$transaction(async (transaction) => {
        const oilChange = await transaction.oilChange.create({
          data: {
            vehicleId: input.vehicleId,
            oilType: input.oilType,
            liters: input.liters,
            valuePerLiter: input.valuePerLiter,
            totalValue,
            date: new Date(input.date),
          },
        });

        await transaction.financialEntry.create({
          data: {
            kind: "EXPENSE",
            category: "Óleo",
            description: `Troca de óleo - ${vehicle.name}`,
            value: totalValue,
            date: new Date(input.date),
            vehicleId: input.vehicleId,
          },
        });

        return {
          id: oilChange.id,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          oilType: oilChange.oilType,
          liters: Number(oilChange.liters),
          valuePerLiter: Number(oilChange.valuePerLiter),
          totalValue,
          date: input.date,
        } satisfies OilChange;
      });
    },
    () => {
      const vehicle = demoDataset.vehicles.find((item) => item.id === input.vehicleId);

      if (!vehicle) {
        throw new Error("Veículo não encontrado.");
      }

      const totalValue = Number((input.liters * input.valuePerLiter).toFixed(2));
      const oilChange: OilChange = {
        id: randomUUID(),
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        oilType: input.oilType,
        liters: input.liters,
        valuePerLiter: input.valuePerLiter,
        totalValue,
        date: input.date,
      };

      demoDataset.oilChanges.unshift(oilChange);
      demoDataset.financialEntries.unshift(
        financialEntryForExpense(
          "Óleo",
          `Troca de óleo - ${vehicle.name}`,
          totalValue,
          input.date,
          vehicle,
        ),
      );
      persistLocalDataset();
      return oilChange;
    },
  );
}

export async function updateOilChange(id: string, input: OilInput) {
  return withDb(
    async () => {
      const totalValue = Number((input.liters * input.valuePerLiter).toFixed(2));

      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.oilChange.findUniqueOrThrow({
          where: { id },
          include: { vehicle: true },
        });
        const vehicle = await transaction.vehicle.findUniqueOrThrow({
          where: { id: input.vehicleId },
        });
        const oilChange = await transaction.oilChange.update({
          where: { id },
          data: {
            vehicleId: input.vehicleId,
            oilType: input.oilType,
            liters: input.liters,
            valuePerLiter: input.valuePerLiter,
            totalValue,
            date: new Date(input.date),
          },
        });
        const linkedEntry = await transaction.financialEntry.findFirst({
          where: {
            kind: "EXPENSE",
            category: "Óleo",
            vehicleId: existing.vehicleId,
            date: existing.date,
            value: existing.totalValue,
          },
          orderBy: { createdAt: "desc" },
        });
        const financialData = {
          kind: "EXPENSE" as const,
          category: "Óleo",
          description: `Troca de óleo - ${vehicle.name}`,
          value: totalValue,
          date: new Date(input.date),
          vehicleId: input.vehicleId,
        };

        if (linkedEntry) {
          await transaction.financialEntry.update({
            where: { id: linkedEntry.id },
            data: financialData,
          });
        } else {
          await transaction.financialEntry.create({ data: financialData });
        }

        return {
          id: oilChange.id,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          oilType: oilChange.oilType,
          liters: Number(oilChange.liters),
          valuePerLiter: Number(oilChange.valuePerLiter),
          totalValue,
          date: input.date,
        } satisfies OilChange;
      });
    },
    () => {
      const existing = demoDataset.oilChanges.find((item) => item.id === id);
      const vehicle = demoDataset.vehicles.find((item) => item.id === input.vehicleId);

      if (!existing || !vehicle) {
        throw new Error("Registro não encontrado.");
      }

      const totalValue = Number((input.liters * input.valuePerLiter).toFixed(2));
      const next: OilChange = {
        id,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        oilType: input.oilType,
        liters: input.liters,
        valuePerLiter: input.valuePerLiter,
        totalValue,
        date: input.date,
      };
      const linkedEntry = demoDataset.financialEntries.find((entry) =>
        matchLinkedExpense(entry, {
          category: "Óleo",
          date: existing.date,
          vehicleId: existing.vehicleId,
          value: existing.totalValue,
        }),
      );

      if (linkedEntry) {
        linkedEntry.description = `Troca de óleo - ${vehicle.name}`;
        linkedEntry.value = totalValue;
        linkedEntry.date = input.date;
        linkedEntry.vehicleId = vehicle.id;
        linkedEntry.vehicleName = vehicle.name;
      } else {
        demoDataset.financialEntries.unshift(
          financialEntryForExpense(
            "Óleo",
            `Troca de óleo - ${vehicle.name}`,
            totalValue,
            input.date,
            vehicle,
          ),
        );
      }

      const updated = replaceItem(demoDataset.oilChanges, id, next);
      persistLocalDataset();
      return updated;
    },
  );
}

export async function createFuelLog(input: FuelInput) {
  return withDb(
    async () => {
      const vehicle = await prisma.vehicle.findUniqueOrThrow({
        where: { id: input.vehicleId },
      });
      const totalValue = Number((input.liters * input.pricePerLiter).toFixed(2));

      return prisma.$transaction(async (transaction) => {
        const fuel = await transaction.fuelLog.create({
          data: {
            vehicleId: input.vehicleId,
            fuelType: input.fuelType,
            liters: input.liters,
            pricePerLiter: input.pricePerLiter,
            totalValue,
            station: input.station,
            date: new Date(input.date),
          },
        });

        await transaction.financialEntry.create({
          data: {
            kind: "EXPENSE",
            category: "Combustível",
            description: `Abastecimento - ${vehicle.name}`,
            value: totalValue,
            date: new Date(input.date),
            vehicleId: input.vehicleId,
          },
        });

        return {
          id: fuel.id,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          fuelType: fuel.fuelType,
          liters: Number(fuel.liters),
          pricePerLiter: Number(fuel.pricePerLiter),
          totalValue,
          station: fuel.station,
          date: input.date,
        } satisfies FuelLog;
      });
    },
    () => {
      const vehicle = demoDataset.vehicles.find((item) => item.id === input.vehicleId);

      if (!vehicle) {
        throw new Error("Veículo não encontrado.");
      }

      const totalValue = Number((input.liters * input.pricePerLiter).toFixed(2));
      const fuel: FuelLog = {
        id: randomUUID(),
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        fuelType: input.fuelType,
        liters: input.liters,
        pricePerLiter: input.pricePerLiter,
        totalValue,
        station: input.station,
        date: input.date,
      };

      demoDataset.fuelLogs.unshift(fuel);
      demoDataset.financialEntries.unshift(
        financialEntryForExpense(
          "Combustível",
          `Abastecimento - ${vehicle.name}`,
          totalValue,
          input.date,
          vehicle,
        ),
      );
      persistLocalDataset();
      return fuel;
    },
  );
}

export async function updateFuelLog(id: string, input: FuelInput) {
  return withDb(
    async () => {
      const totalValue = Number((input.liters * input.pricePerLiter).toFixed(2));

      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.fuelLog.findUniqueOrThrow({
          where: { id },
          include: { vehicle: true },
        });
        const vehicle = await transaction.vehicle.findUniqueOrThrow({
          where: { id: input.vehicleId },
        });
        const fuel = await transaction.fuelLog.update({
          where: { id },
          data: {
            vehicleId: input.vehicleId,
            fuelType: input.fuelType,
            liters: input.liters,
            pricePerLiter: input.pricePerLiter,
            totalValue,
            station: input.station,
            date: new Date(input.date),
          },
        });
        const linkedEntry = await transaction.financialEntry.findFirst({
          where: {
            kind: "EXPENSE",
            category: "Combustível",
            vehicleId: existing.vehicleId,
            date: existing.date,
            value: existing.totalValue,
          },
          orderBy: { createdAt: "desc" },
        });
        const financialData = {
          kind: "EXPENSE" as const,
          category: "Combustível",
          description: `Abastecimento - ${vehicle.name}`,
          value: totalValue,
          date: new Date(input.date),
          vehicleId: input.vehicleId,
        };

        if (linkedEntry) {
          await transaction.financialEntry.update({
            where: { id: linkedEntry.id },
            data: financialData,
          });
        } else {
          await transaction.financialEntry.create({ data: financialData });
        }

        return {
          id: fuel.id,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          fuelType: fuel.fuelType,
          liters: Number(fuel.liters),
          pricePerLiter: Number(fuel.pricePerLiter),
          totalValue,
          station: fuel.station,
          date: input.date,
        } satisfies FuelLog;
      });
    },
    () => {
      const existing = demoDataset.fuelLogs.find((item) => item.id === id);
      const vehicle = demoDataset.vehicles.find((item) => item.id === input.vehicleId);

      if (!existing || !vehicle) {
        throw new Error("Registro não encontrado.");
      }

      const totalValue = Number((input.liters * input.pricePerLiter).toFixed(2));
      const next: FuelLog = {
        id,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        fuelType: input.fuelType,
        liters: input.liters,
        pricePerLiter: input.pricePerLiter,
        totalValue,
        station: input.station,
        date: input.date,
      };
      const linkedEntry = demoDataset.financialEntries.find((entry) =>
        matchLinkedExpense(entry, {
          category: "Combustível",
          date: existing.date,
          vehicleId: existing.vehicleId,
          value: existing.totalValue,
        }),
      );

      if (linkedEntry) {
        linkedEntry.description = `Abastecimento - ${vehicle.name}`;
        linkedEntry.value = totalValue;
        linkedEntry.date = input.date;
        linkedEntry.vehicleId = vehicle.id;
        linkedEntry.vehicleName = vehicle.name;
      } else {
        demoDataset.financialEntries.unshift(
          financialEntryForExpense(
            "Combustível",
            `Abastecimento - ${vehicle.name}`,
            totalValue,
            input.date,
            vehicle,
          ),
        );
      }

      const updated = replaceItem(demoDataset.fuelLogs, id, next);
      persistLocalDataset();
      return updated;
    },
  );
}

export async function createFinancialEntry(input: FinancialInput) {
  return withDb(
    async () => {
      const entry = await prisma.financialEntry.create({
        data: {
          kind: input.kind,
          category: input.category,
          description: input.description,
          value: input.value,
          date: new Date(input.date),
          vehicleId: input.vehicleId || null,
          serviceMotorcycleId: input.serviceMotorcycleId || null,
        },
        include: { vehicle: true, serviceMotorcycle: true },
      });

      return {
        id: entry.id,
        kind: entry.kind,
        category: entry.category,
        description: entry.description,
        value: Number(entry.value),
        date: input.date,
        vehicleId: entry.vehicleId,
        vehicleName: entry.vehicle?.name ?? null,
        serviceMotorcycleId: entry.serviceMotorcycleId,
        serviceMotorcycleName: entry.serviceMotorcycle
          ? `${entry.serviceMotorcycle.brand} ${entry.serviceMotorcycle.model}`
          : null,
      } satisfies FinancialEntry;
    },
    () => {
      const entry: FinancialEntry = {
        id: randomUUID(),
        ...input,
        vehicleId: input.vehicleId || null,
        vehicleName: getVehicleName(demoDataset, input.vehicleId),
        serviceMotorcycleId: input.serviceMotorcycleId || null,
        serviceMotorcycleName: getMotorcycleName(demoDataset, input.serviceMotorcycleId),
      };
      demoDataset.financialEntries.unshift(entry);
      persistLocalDataset();
      return entry;
    },
  );
}

export async function updateFinancialEntry(id: string, input: FinancialInput) {
  return withDb(
    async () => {
      const entry = await prisma.financialEntry.update({
        where: { id },
        data: {
          kind: input.kind,
          category: input.category,
          description: input.description,
          value: input.value,
          date: new Date(input.date),
          vehicleId: input.vehicleId || null,
          serviceMotorcycleId: input.serviceMotorcycleId || null,
        },
        include: { vehicle: true, serviceMotorcycle: true },
      });

      return {
        id: entry.id,
        kind: entry.kind,
        category: entry.category,
        description: entry.description,
        value: Number(entry.value),
        date: input.date,
        vehicleId: entry.vehicleId,
        vehicleName: entry.vehicle?.name ?? null,
        serviceMotorcycleId: entry.serviceMotorcycleId,
        serviceMotorcycleName: entry.serviceMotorcycle
          ? `${entry.serviceMotorcycle.brand} ${entry.serviceMotorcycle.model}`
          : null,
      } satisfies FinancialEntry;
    },
    () => {
      const entry: FinancialEntry = {
        id,
        ...input,
        vehicleId: input.vehicleId || null,
        vehicleName: getVehicleName(demoDataset, input.vehicleId),
        serviceMotorcycleId: input.serviceMotorcycleId || null,
        serviceMotorcycleName: getMotorcycleName(demoDataset, input.serviceMotorcycleId),
      };

      const updated = replaceItem(demoDataset.financialEntries, id, entry);
      persistLocalDataset();
      return updated;
    },
  );
}

export async function createSupplier(input: SupplierInput) {
  return withDb(
    async () => {
      const supplier = await prisma.supplier.create({ data: input });
      return supplier satisfies Supplier;
    },
    () => {
      const supplier: Supplier = {
        id: randomUUID(),
        ...input,
      };
      demoDataset.suppliers.unshift(supplier);
      persistLocalDataset();
      return supplier;
    },
  );
}

export async function updateSupplier(id: string, input: SupplierInput) {
  return withDb(
    async () => {
      const supplier = await prisma.supplier.update({
        where: { id },
        data: input,
      });

      return supplier satisfies Supplier;
    },
    () => {
      const supplier: Supplier = {
        id,
        ...input,
      };

      demoDataset.partStock.forEach((part) => {
        if (part.supplierId === id) {
          part.supplierName = supplier.name;
        }
      });

      const updated = replaceItem(demoDataset.suppliers, id, supplier);
      persistLocalDataset();
      return updated;
    },
  );
}

export async function createPart(input: PartInput) {
  return withDb(
    async () => {
      const part = await prisma.$transaction(async (transaction) => {
        const created = await transaction.partStock.create({
          data: {
            name: input.name,
            category: input.category,
            sku: input.sku.toUpperCase(),
            manufacturer: input.manufacturer,
            quantity: input.quantity,
            minQuantity: input.minQuantity,
            unitCost: input.unitCost,
            entryDate: new Date(input.entryDate),
            supplierId: input.supplierId || null,
            notes: input.notes,
          },
          include: { supplier: true, stockMovements: true },
        });

        if (input.quantity > 0) {
          const totalValue = Number((input.quantity * input.unitCost).toFixed(2));
          await transaction.stockMovement.create({
            data: {
              partStockId: created.id,
              kind: "IN",
              quantity: input.quantity,
              unitCost: input.unitCost,
              totalValue,
              date: new Date(input.entryDate),
              purchaseDate: new Date(input.entryDate),
              supplierId: input.supplierId || null,
              invoiceNumber: "Cadastro inicial",
              responsibleUser: "Sistema",
              notes: input.notes,
            },
          });
          await transaction.financialEntry.create({
            data: {
              kind: "EXPENSE",
              category: "Estoque",
              description: `Entrada inicial - ${input.name}`,
              value: totalValue,
              date: new Date(input.entryDate),
            },
          });
        }

        return created;
      });

      return toPartStock(part);
    },
    () => {
      const supplier = demoDataset.suppliers.find((item) => item.id === input.supplierId);
      const partId = randomUUID();
      const part: PartStock = {
        id: partId,
        ...input,
        sku: input.sku.toUpperCase(),
        supplierId: input.supplierId || null,
        supplierName: supplier?.name ?? null,
        lastEntryDate: input.quantity > 0 ? input.entryDate : null,
      };
      demoDataset.partStock.unshift(part);
      if (input.quantity > 0) {
        const totalValue = Number((input.quantity * input.unitCost).toFixed(2));
        demoDataset.stockMovements.unshift({
          id: randomUUID(),
          partStockId: partId,
          partName: part.name,
          kind: "IN",
          quantity: input.quantity,
          unitCost: input.unitCost,
          totalValue,
          date: input.entryDate,
          purchaseDate: input.entryDate,
          supplierId: input.supplierId || null,
          supplierName: supplier?.name ?? null,
          invoiceNumber: "Cadastro inicial",
          responsibleUser: "Sistema",
          notes: input.notes,
          createdAt: input.entryDate,
        });
        demoDataset.financialEntries.unshift({
          id: randomUUID(),
          kind: "EXPENSE",
          category: "Estoque",
          description: `Entrada inicial - ${input.name}`,
          value: totalValue,
          date: input.entryDate,
        });
      }
      persistLocalDataset();
      return part;
    },
  );
}

export async function updatePart(id: string, input: PartInput) {
  return withDb(
    async () => {
      const part = await prisma.partStock.update({
        where: { id },
        data: {
          name: input.name,
          category: input.category,
          sku: input.sku.toUpperCase(),
          manufacturer: input.manufacturer,
          quantity: input.quantity,
          minQuantity: input.minQuantity,
          unitCost: input.unitCost,
          entryDate: new Date(input.entryDate),
          supplierId: input.supplierId || null,
          notes: input.notes,
        },
        include: { supplier: true, stockMovements: { orderBy: { date: "desc" }, take: 1 } },
      });

      return toPartStock(part);
    },
    () => {
      const supplier = demoDataset.suppliers.find((item) => item.id === input.supplierId);
      const existing = demoDataset.partStock.find((item) => item.id === id);
      const part: PartStock = {
        id,
        ...input,
        sku: input.sku.toUpperCase(),
        supplierId: input.supplierId || null,
        supplierName: supplier?.name ?? null,
        lastEntryDate: existing?.lastEntryDate ?? null,
      };

      demoDataset.maintenances.forEach((maintenance) => {
        maintenance.parts.forEach((maintenancePart) => {
          if (maintenancePart.partStockId === id) {
            maintenancePart.name = part.name;
          }
        });
      });

      const updated = replaceItem(demoDataset.partStock, id, part);
      persistLocalDataset();
      return updated;
    },
  );
}

export async function deletePart(id: string, userName = "Administrador") {
  return withDb(
    async () => {
      const part = await prisma.partStock.findUniqueOrThrow({
        where: { id },
        include: { supplier: true },
      });
      await prisma.$transaction([
        prisma.partStock.update({
          where: { id },
          data: { deletedAt: new Date(), deletedBy: userName },
        }),
        prisma.deletedItem.create({
          data: {
            entity: "Estoque",
            entityId: id,
            label: part.name,
            payload: {
              ...toPartStock(part),
              supplierName: part.supplier?.name ?? null,
            },
            deletedBy: userName,
          },
        }),
      ]);
      return { id };
    },
    () => {
      const index = demoDataset.partStock.findIndex((part) => part.id === id);
      if (index === -1) {
        throw new Error("Registro nao encontrado.");
      }

      const [part] = demoDataset.partStock.splice(index, 1);
      demoDataset.deletedItems.unshift({
        id: randomUUID(),
        entity: "Estoque",
        entityId: part.id,
        label: part.name,
        payload: part,
        deletedBy: userName,
        deletedAt: new Date().toISOString(),
        restoredAt: null,
        permanentlyDeletedAt: null,
      });
      persistLocalDataset();
      return { id };
    },
  );
}

export async function createStockEntry(input: StockEntryInput) {
  return withDb(
    async () => {
      const totalValue = Number((input.quantity * input.unitCost).toFixed(2));

      return prisma.$transaction(async (transaction) => {
        const current = await transaction.partStock.findUniqueOrThrow({
          where: { id: input.partStockId },
          include: { supplier: true },
        });
        const movement = await transaction.stockMovement.create({
          data: {
            partStockId: input.partStockId,
            kind: "IN",
            quantity: input.quantity,
            unitCost: input.unitCost,
            totalValue,
            date: new Date(input.date),
            purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : new Date(input.date),
            supplierId: input.supplierId || current.supplierId,
            invoiceNumber: input.invoiceNumber,
            responsibleUser: input.responsibleUser,
            notes: input.notes,
          },
          include: { partStock: true, supplier: true },
        });

        await transaction.partStock.update({
          where: { id: input.partStockId },
          data: {
            quantity: { increment: input.quantity },
            unitCost: input.unitCost,
            entryDate: new Date(input.date),
            supplierId: input.supplierId || current.supplierId,
          },
        });
        await transaction.financialEntry.create({
          data: {
            kind: "EXPENSE",
            category: "Estoque",
            description: `Compra de pecas - ${current.name}`,
            value: totalValue,
            date: new Date(input.date),
          },
        });

        if (Number(current.unitCost) > 0 && input.unitCost > Number(current.unitCost) * 1.05) {
          await transaction.notification.create({
            data: {
              title: "Aumento de preco",
              message: `${current.name} teve aumento de fornecedor acima de 5%.`,
              type: "WARNING",
            },
          });
        }

        return toStockMovement(movement);
      });
    },
    () => {
      const part = demoDataset.partStock.find((item) => item.id === input.partStockId);

      if (!part) {
        throw new Error("Peca nao encontrada.");
      }

      const supplier = demoDataset.suppliers.find(
        (item) => item.id === (input.supplierId || part.supplierId),
      );
      const totalValue = Number((input.quantity * input.unitCost).toFixed(2));
      const movement: StockMovement = {
        id: randomUUID(),
        partStockId: part.id,
        partName: part.name,
        kind: "IN",
        quantity: input.quantity,
        unitCost: input.unitCost,
        totalValue,
        date: input.date,
        purchaseDate: input.purchaseDate || input.date,
        supplierId: input.supplierId || part.supplierId,
        supplierName: supplier?.name ?? part.supplierName ?? null,
        invoiceNumber: input.invoiceNumber,
        responsibleUser: input.responsibleUser,
        notes: input.notes,
        createdAt: input.date,
      };

      if (part.unitCost > 0 && input.unitCost > part.unitCost * 1.05) {
        demoDataset.notifications.unshift({
          id: randomUUID(),
          title: "Aumento de preco",
          message: `${part.name} teve aumento de fornecedor acima de 5%.`,
          type: "WARNING",
          read: false,
          createdAt: input.date,
        });
      }

      part.quantity += input.quantity;
      part.unitCost = input.unitCost;
      part.entryDate = input.date;
      part.supplierId = input.supplierId || part.supplierId;
      part.supplierName = supplier?.name ?? part.supplierName ?? null;
      part.lastEntryDate = input.date;
      demoDataset.stockMovements.unshift(movement);
      demoDataset.financialEntries.unshift({
        id: randomUUID(),
        kind: "EXPENSE",
        category: "Estoque",
        description: `Compra de pecas - ${part.name}`,
        value: totalValue,
        date: input.date,
      });
      demoDataset.activityLogs.unshift({
        id: randomUUID(),
        userName: input.responsibleUser,
        action: "CREATE",
        entity: "Estoque",
        entityId: movement.id,
        description: `Entrada de ${input.quantity} unidade(s) de ${part.name}.`,
        createdAt: input.date,
      });
      persistLocalDataset();
      return movement;
    },
  );
}

export async function createServiceMotorcycle(input: ServiceMotorcycleInput) {
  return withDb(
    async () => {
      const motorcycle = await prisma.serviceMotorcycle.create({
        data: {
          model: input.model,
          brand: input.brand,
          plate: input.plate.toUpperCase(),
          year: input.year,
          mileage: input.mileage,
          status: input.status,
          driver: input.driver,
          photoUrl: input.photoUrl,
          notes: input.notes,
        },
      });

      return toServiceMotorcycle(motorcycle);
    },
    () => {
      const motorcycle: ServiceMotorcycle = {
        id: randomUUID(),
        ...input,
        plate: input.plate.toUpperCase(),
      };
      demoDataset.serviceMotorcycles.unshift(motorcycle);
      demoDataset.activityLogs.unshift({
        id: randomUUID(),
        userName: "Administrador",
        action: "CREATE",
        entity: "Motos de Servico",
        entityId: motorcycle.id,
        description: `Moto ${motorcycle.plate} cadastrada.`,
        createdAt: inputDate(new Date()),
      });
      persistLocalDataset();
      return motorcycle;
    },
  );
}

export async function updateServiceMotorcycle(id: string, input: ServiceMotorcycleInput) {
  return withDb(
    async () => {
      const motorcycle = await prisma.serviceMotorcycle.update({
        where: { id },
        data: {
          model: input.model,
          brand: input.brand,
          plate: input.plate.toUpperCase(),
          year: input.year,
          mileage: input.mileage,
          status: input.status,
          driver: input.driver,
          photoUrl: input.photoUrl,
          notes: input.notes,
        },
      });

      return toServiceMotorcycle(motorcycle);
    },
    () => {
      const motorcycle: ServiceMotorcycle = {
        id,
        ...input,
        plate: input.plate.toUpperCase(),
      };

      demoDataset.motorcycleTrips.forEach((trip) => {
        if (trip.motorcycleId === id) {
          trip.motorcycleName = `${motorcycle.brand} ${motorcycle.model}`;
          trip.motorcyclePlate = motorcycle.plate;
        }
      });
      demoDataset.motorcycleFines.forEach((fine) => {
        if (fine.motorcycleId === id) {
          fine.motorcycleName = `${motorcycle.brand} ${motorcycle.model}`;
          fine.motorcyclePlate = motorcycle.plate;
        }
      });
      demoDataset.financialEntries.forEach((entry) => {
        if (entry.serviceMotorcycleId === id) {
          entry.serviceMotorcycleName = `${motorcycle.brand} ${motorcycle.model}`;
        }
      });

      const updated = replaceItem(demoDataset.serviceMotorcycles, id, motorcycle);
      persistLocalDataset();
      return updated;
    },
  );
}

export async function createMotorcycleTrip(input: MotorcycleTripInput) {
  return withDb(
    async () => {
      return prisma.$transaction(async (transaction) => {
        const motorcycle = await transaction.serviceMotorcycle.findUniqueOrThrow({
          where: { id: input.motorcycleId },
        });
        const trip = await transaction.motorcycleTrip.create({
          data: {
            serviceMotorcycleId: input.motorcycleId,
            departureAt: new Date(input.departureAt),
            returnAt: input.returnAt ? new Date(input.returnAt) : null,
            driver: input.driver,
            destination: input.destination,
            serviceDone: input.serviceDone,
            quantityTransported: input.quantityTransported,
            notes: input.notes,
          },
          include: { serviceMotorcycle: true, fine: { include: { serviceMotorcycle: true } } },
        });

        await transaction.serviceMotorcycle.update({
          where: { id: input.motorcycleId },
          data: {
            status: input.returnAt ? "GARAGE" : "IN_SERVICE",
            driver: input.driver,
          },
        });

        if (input.hasFine) {
          const fineValue = input.fineValue ?? 0;
          await transaction.motorcycleFine.create({
            data: {
              serviceMotorcycleId: input.motorcycleId,
              tripId: trip.id,
              value: fineValue,
              paidAmount: 0,
              paymentStatus: "PENDING",
              paymentHistory: [],
              reason: input.fineReason ?? "Multa operacional",
              date: new Date(input.fineDate ?? input.departureAt),
              notes: input.fineNotes,
            },
          });
          await transaction.financialEntry.create({
            data: {
              kind: "EXPENSE",
              category: "Multas",
              description: `Multa - ${motorcycle.brand} ${motorcycle.model}`,
              value: fineValue,
              date: new Date(input.fineDate ?? input.departureAt),
              serviceMotorcycleId: input.motorcycleId,
            },
          });
        }

        const saved = await transaction.motorcycleTrip.findUniqueOrThrow({
          where: { id: trip.id },
          include: { serviceMotorcycle: true, fine: { include: { serviceMotorcycle: true } } },
        });

        return toMotorcycleTrip(saved);
      });
    },
    () => {
      const motorcycle = demoDataset.serviceMotorcycles.find(
        (item) => item.id === input.motorcycleId,
      );

      if (!motorcycle) {
        throw new Error("Moto nao encontrada.");
      }

      const tripId = randomUUID();
      const fine: MotorcycleFine | null = input.hasFine
        ? {
            id: randomUUID(),
            motorcycleId: motorcycle.id,
            motorcycleName: `${motorcycle.brand} ${motorcycle.model}`,
            motorcyclePlate: motorcycle.plate,
            tripId,
            value: input.fineValue ?? 0,
            paidAmount: 0,
            paymentStatus: "PENDING",
            paidBy: null,
            authorizedBy: null,
            paidAt: null,
            paymentNotes: null,
            paymentHistory: [],
            reason: input.fineReason ?? "Multa operacional",
            date: input.fineDate ?? input.departureAt.slice(0, 10),
            notes: input.fineNotes,
          }
        : null;
      const trip: MotorcycleTrip = {
        id: tripId,
        motorcycleId: motorcycle.id,
        motorcycleName: `${motorcycle.brand} ${motorcycle.model}`,
        motorcyclePlate: motorcycle.plate,
        departureAt: input.departureAt,
        returnAt: input.returnAt || null,
        driver: input.driver,
        destination: input.destination,
        serviceDone: input.serviceDone,
        quantityTransported: input.quantityTransported,
        notes: input.notes,
        fine,
      };

      motorcycle.status = input.returnAt ? "GARAGE" : "IN_SERVICE";
      motorcycle.driver = input.driver;
      demoDataset.motorcycleTrips.unshift(trip);

      if (fine) {
        demoDataset.motorcycleFines.unshift(fine);
        demoDataset.financialEntries.unshift({
          id: randomUUID(),
          kind: "EXPENSE",
          category: "Multas",
          description: `Multa - ${trip.motorcycleName}`,
          value: fine.value,
          date: fine.date,
          serviceMotorcycleId: motorcycle.id,
          serviceMotorcycleName: trip.motorcycleName,
        });
      }

      demoDataset.activityLogs.unshift({
        id: randomUUID(),
        userName: input.driver,
        action: "CREATE",
        entity: "Saida de moto",
        entityId: trip.id,
        description: `Saida registrada para ${trip.motorcyclePlate}.`,
        createdAt: input.departureAt.slice(0, 10),
      });
      persistLocalDataset();
      return trip;
    },
  );
}

export async function updateMotorcycleFinePayment(
  id: string,
  input: MotorcycleFinePaymentInput,
  changedBy: string,
) {
  const paidAmount = Number(input.paidAmount ?? 0);

  return withDb(
    async () => {
      const current = await prisma.motorcycleFine.findUniqueOrThrow({
        where: { id },
        include: { serviceMotorcycle: true },
      });
      const value = Number(current.value);
      if (paidAmount > value) {
        throw new Error("O valor pago nao pode ultrapassar o valor total da multa.");
      }

      const status = finePaymentStatus(value, paidAmount);
      const history = normalizePaymentHistory(current.paymentHistory);
      const event: FinePaymentHistory = {
        id: randomUUID(),
        paidAmount,
        paymentStatus: status,
        paidBy: input.paidBy ?? null,
        authorizedBy: input.authorizedBy ?? null,
        paidAt: input.paidAt || null,
        notes: input.paymentNotes ?? null,
        changedBy,
        createdAt: new Date().toISOString(),
      };

      const saved = await prisma.motorcycleFine.update({
        where: { id },
        data: {
          paidAmount,
          paymentStatus: status,
          paidBy: input.paidBy || null,
          authorizedBy: input.authorizedBy || null,
          paidAt: input.paidAt ? new Date(input.paidAt) : null,
          paymentNotes: input.paymentNotes || null,
          paymentHistory: [...history, event] as Prisma.InputJsonValue,
        },
        include: { serviceMotorcycle: true },
      });

      return toMotorcycleFine(saved);
    },
    () => {
      const fine = demoDataset.motorcycleFines.find((item) => item.id === id);
      if (!fine) {
        throw new Error("Multa nao encontrada.");
      }
      if (paidAmount > fine.value) {
        throw new Error("O valor pago nao pode ultrapassar o valor total da multa.");
      }

      const status = finePaymentStatus(fine.value, paidAmount);
      const event: FinePaymentHistory = {
        id: randomUUID(),
        paidAmount,
        paymentStatus: status,
        paidBy: input.paidBy ?? null,
        authorizedBy: input.authorizedBy ?? null,
        paidAt: input.paidAt || null,
        notes: input.paymentNotes ?? null,
        changedBy,
        createdAt: new Date().toISOString(),
      };
      const next: MotorcycleFine = {
        ...fine,
        paidAmount,
        paymentStatus: status,
        paidBy: input.paidBy || null,
        authorizedBy: input.authorizedBy || null,
        paidAt: input.paidAt || null,
        paymentNotes: input.paymentNotes || null,
        paymentHistory: [...(fine.paymentHistory ?? []), event],
      };

      replaceItem(demoDataset.motorcycleFines, id, next);
      demoDataset.motorcycleTrips = demoDataset.motorcycleTrips.map((trip) =>
        trip.fine?.id === id ? { ...trip, fine: next } : trip,
      );
      persistLocalDataset();
      return next;
    },
  );
}

export async function markNotificationRead(id: string) {
  return withDb(
    async () => {
      const notification = await prisma.notification.update({
        where: { id },
        data: { read: true },
        include: { vehicle: true },
      });

      return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        dueDate: notification.dueDate ? inputDate(notification.dueDate) : null,
        vehicleId: notification.vehicleId,
        vehicleName: notification.vehicle?.name ?? null,
        createdAt: inputDate(notification.createdAt),
      } satisfies AppNotification;
    },
    () => {
      const notification = demoDataset.notifications.find((item) => item.id === id);
      if (notification) {
        notification.read = true;
        persistLocalDataset();
      }

      return notification ?? null;
    },
  );
}

export async function updateCompanySettings(input: CompanySettings) {
  const settings = toCompanySettings(input);

  return withDb(
    async () => {
      const saved = await prisma.appSetting.upsert({
        where: { id: "default" },
        update: settings,
        create: { id: "default", ...settings },
      });

      return toCompanySettings({
        cooperativeName: saved.cooperativeName,
        logoUrl: saved.logoUrl,
        theme: saved.theme as CompanySettings["theme"],
        currency: saved.currency,
        timezone: saved.timezone,
        backupFrequency: saved.backupFrequency as CompanySettings["backupFrequency"],
        backupRetentionDays: saved.backupRetentionDays,
        notificationsEnabled: saved.notificationsEnabled,
        sessionTimeoutMinutes: saved.sessionTimeoutMinutes,
      });
    },
    () => {
      demoDataset.companySettings = settings;
      demoDataset.backupRecords = pruneLocalBackups(
        demoDataset.backupRecords,
        settings.backupRetentionDays,
      );
      persistLocalDataset();
      return settings;
    },
  );
}

export async function createBackup(type: BackupRecord["type"], createdBy: string) {
  const dataset = await getDataset();
  const record = writeBackupFile(dataset, type, createdBy);

  return withDb(
    async () => {
      const saved = await prisma.backupRecord.create({
        data: record,
      });
      return {
        ...record,
        id: saved.id,
        createdAt: saved.createdAt.toISOString(),
      };
    },
    () => {
      demoDataset = loadLocalDataset();
      demoDataset.backupRecords.unshift(record);
      demoDataset.backupRecords = pruneLocalBackups(
        demoDataset.backupRecords,
        demoDataset.companySettings.backupRetentionDays,
      );
      persistLocalDataset();
      return record;
    },
  );
}

export async function restoreBackup(payload: unknown, userName: string) {
  const data = (payload as { data?: Dataset }).data ?? payload;
  const restoredDataset = data as Dataset;

  if (isDatabaseConfigured()) {
    await prisma.$transaction(async (transaction) => {
      await transaction.notification.deleteMany();
      await transaction.backupRecord.deleteMany();
      await transaction.deletedItem.deleteMany();
      await transaction.attachment.deleteMany();
      await transaction.auditTrail.deleteMany();
      await transaction.activityLog.deleteMany();
      await transaction.stockMovement.deleteMany();
      await transaction.motorcycleFine.deleteMany();
      await transaction.motorcycleTrip.deleteMany();
      await transaction.fuelLog.deleteMany();
      await transaction.financialEntry.deleteMany();
      await transaction.oilChange.deleteMany();
      await transaction.maintenancePart.deleteMany();
      await transaction.maintenance.deleteMany();
      await transaction.serviceMotorcycle.deleteMany();
      await transaction.partStock.deleteMany();
      await transaction.supplier.deleteMany();
      await transaction.vehicle.deleteMany();
      await transaction.appSetting.deleteMany();

      for (const supplier of restoredDataset.suppliers) {
        await transaction.supplier.create({ data: supplier });
      }
      for (const vehicle of restoredDataset.vehicles) {
        await transaction.vehicle.create({
          data: {
            id: vehicle.id,
            name: vehicle.name,
            model: vehicle.model,
            plate: vehicle.plate,
            year: vehicle.year,
            driver: vehicle.driver,
            entryDate: new Date(vehicle.entryDate),
            exitDate: vehicle.exitDate ? new Date(vehicle.exitDate) : null,
            status: vehicle.status,
            mileage: vehicle.mileage,
          },
        });
      }
      for (const part of restoredDataset.partStock) {
        await transaction.partStock.create({
          data: {
            id: part.id,
            name: part.name,
            category: part.category,
            sku: part.sku,
            manufacturer: part.manufacturer,
            quantity: part.quantity,
            minQuantity: part.minQuantity,
            unitCost: part.unitCost,
            entryDate: new Date(part.entryDate),
            notes: part.notes,
            supplierId: part.supplierId,
          },
        });
      }
      for (const maintenance of restoredDataset.maintenances) {
        await transaction.maintenance.create({
          data: {
            id: maintenance.id,
            vehicleId: maintenance.vehicleId,
            date: new Date(maintenance.date),
            type: maintenance.type,
            mechanic: maintenance.mechanic,
            notes: maintenance.notes,
            totalValue: maintenance.totalValue,
            parts: {
              create: maintenance.parts.map((part) => ({
                id: part.id,
                partStockId: part.partStockId,
                name: part.name,
                quantity: part.quantity,
                unitValue: part.unitValue,
                totalValue: part.totalValue,
              })),
            },
          },
        });
      }
      for (const motorcycle of restoredDataset.serviceMotorcycles) {
        await transaction.serviceMotorcycle.create({
          data: {
            id: motorcycle.id,
            model: motorcycle.model,
            brand: motorcycle.brand,
            plate: motorcycle.plate,
            year: motorcycle.year,
            mileage: motorcycle.mileage,
            status: motorcycle.status,
            driver: motorcycle.driver,
            photoUrl: motorcycle.photoUrl,
            notes: motorcycle.notes,
          },
        });
      }
      for (const trip of restoredDataset.motorcycleTrips) {
        await transaction.motorcycleTrip.create({
          data: {
            id: trip.id,
            serviceMotorcycleId: trip.motorcycleId,
            departureAt: new Date(trip.departureAt),
            returnAt: trip.returnAt ? new Date(trip.returnAt) : null,
            driver: trip.driver,
            destination: trip.destination,
            serviceDone: trip.serviceDone,
            quantityTransported: trip.quantityTransported,
            notes: trip.notes,
          },
        });
      }
      for (const fine of restoredDataset.motorcycleFines) {
        await transaction.motorcycleFine.create({
          data: {
            id: fine.id,
            serviceMotorcycleId: fine.motorcycleId,
            tripId: fine.tripId,
            value: fine.value,
            paidAmount: fine.paidAmount ?? 0,
            paymentStatus: fine.paymentStatus ?? finePaymentStatus(fine.value, fine.paidAmount ?? 0),
            paidBy: fine.paidBy,
            authorizedBy: fine.authorizedBy,
            paidAt: fine.paidAt ? new Date(fine.paidAt) : null,
            paymentNotes: fine.paymentNotes,
            paymentHistory: fine.paymentHistory
              ? (fine.paymentHistory as Prisma.InputJsonValue)
              : undefined,
            reason: fine.reason,
            date: new Date(fine.date),
            notes: fine.notes,
          },
        });
      }
      for (const oil of restoredDataset.oilChanges) {
        await transaction.oilChange.create({
          data: {
            id: oil.id,
            vehicleId: oil.vehicleId,
            oilType: oil.oilType,
            liters: oil.liters,
            valuePerLiter: oil.valuePerLiter,
            totalValue: oil.totalValue,
            date: new Date(oil.date),
          },
        });
      }
      for (const fuel of restoredDataset.fuelLogs) {
        await transaction.fuelLog.create({
          data: {
            id: fuel.id,
            vehicleId: fuel.vehicleId,
            fuelType: fuel.fuelType,
            liters: fuel.liters,
            pricePerLiter: fuel.pricePerLiter,
            totalValue: fuel.totalValue,
            station: fuel.station,
            date: new Date(fuel.date),
          },
        });
      }
      for (const movement of restoredDataset.stockMovements) {
        await transaction.stockMovement.create({
          data: {
            id: movement.id,
            partStockId: movement.partStockId,
            kind: movement.kind,
            quantity: movement.quantity,
            unitCost: movement.unitCost,
            totalValue: movement.totalValue,
            date: new Date(movement.date),
            purchaseDate: movement.purchaseDate ? new Date(movement.purchaseDate) : null,
            supplierId: movement.supplierId,
            invoiceNumber: movement.invoiceNumber,
            responsibleUser: movement.responsibleUser,
            maintenanceId: movement.maintenanceId,
            notes: movement.notes,
            createdAt: new Date(movement.createdAt),
          },
        });
      }
      for (const entry of restoredDataset.financialEntries) {
        await transaction.financialEntry.create({
          data: {
            id: entry.id,
            kind: entry.kind,
            category: entry.category,
            description: entry.description,
            value: entry.value,
            date: new Date(entry.date),
            vehicleId: entry.vehicleId,
            serviceMotorcycleId: entry.serviceMotorcycleId,
          },
        });
      }
      for (const notification of restoredDataset.notifications) {
        await transaction.notification.create({
          data: {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            read: notification.read,
            dueDate: notification.dueDate ? new Date(notification.dueDate) : null,
            vehicleId: notification.vehicleId,
            createdAt: new Date(notification.createdAt),
          },
        });
      }
      for (const log of restoredDataset.activityLogs) {
        await transaction.activityLog.create({
          data: {
            id: log.id,
            userName: log.userName,
            action: log.action,
            entity: log.entity,
            entityId: log.entityId,
            description: log.description,
            createdAt: new Date(log.createdAt),
            module: log.module,
            date: log.date,
            time: log.time,
            ipAddress: log.ipAddress,
            device: log.device,
            oldValue: log.oldValue === undefined ? undefined : (log.oldValue as Prisma.InputJsonValue),
            newValue: log.newValue === undefined ? undefined : (log.newValue as Prisma.InputJsonValue),
            metadata: log.metadata ? (log.metadata as Prisma.InputJsonValue) : undefined,
          },
        });
      }
      for (const audit of restoredDataset.auditTrail) {
        await transaction.auditTrail.create({
          data: {
            id: audit.id,
            userName: audit.userName,
            module: audit.module,
            entityId: audit.entityId,
            summary: audit.summary,
            oldValue: audit.oldValue === undefined ? undefined : (audit.oldValue as Prisma.InputJsonValue),
            newValue: audit.newValue === undefined ? undefined : (audit.newValue as Prisma.InputJsonValue),
            createdAt: new Date(audit.createdAt),
          },
        });
      }
      for (const attachment of restoredDataset.attachments) {
        await transaction.attachment.create({
          data: attachmentDbData(normalizeAttachment(attachment)),
        });
      }
      for (const item of restoredDataset.deletedItems) {
        await transaction.deletedItem.create({
          data: {
            id: item.id,
            entity: item.entity,
            entityId: item.entityId,
            label: item.label,
            payload: item.payload as Prisma.InputJsonValue,
            deletedBy: item.deletedBy,
            deletedAt: new Date(item.deletedAt),
            restoredAt: item.restoredAt ? new Date(item.restoredAt) : null,
            permanentlyDeletedAt: item.permanentlyDeletedAt
              ? new Date(item.permanentlyDeletedAt)
              : null,
          },
        });
      }
      await transaction.appSetting.create({
        data: { id: "default", ...toCompanySettings(restoredDataset.companySettings) },
      });
    });

    const record = writeBackupFile(restoredDataset, "RESTORE", userName);
    await prisma.backupRecord.create({ data: record });
    return record;
  }

  saveLocalDataset(data as Dataset);
  demoDataset = loadLocalDataset();

  const record = writeBackupFile(demoDataset, "RESTORE", userName);
  demoDataset.backupRecords.unshift(record);
  demoDataset.activityLogs.unshift({
    id: randomUUID(),
    userName,
    action: "RESTORE",
    entity: "Backup",
    entityId: record.id,
    description: "Backup restaurado a partir de arquivo JSON.",
    createdAt: record.createdAt,
    module: "Backup",
    date: record.createdAt.slice(0, 10),
    time: record.createdAt.slice(11, 19),
    ipAddress: "127.0.0.1",
    device: "Navegador",
  });
  persistLocalDataset();

  return record;
}

export function getBackupFilePath(fileName: string) {
  return join(backupDirectory, basename(fileName));
}

export function getUploadFilePath(fileName: string) {
  return join(uploadDirectory, basename(fileName));
}

function attachmentModuleLabel(ownerType: AttachmentOwnerType) {
  const labels: Record<AttachmentOwnerType, string> = {
    maintenance: "Manutencao",
    oil: "Oleo",
    fuel: "Combustivel",
    fine: "Multas",
    supplier: "Fornecedores",
    inventory: "Estoque",
    vehicle: "Veiculos",
    motorcycle: "Motos de Servico",
  };

  return labels[ownerType];
}

function attachmentRelationFields(ownerType: AttachmentOwnerType, ownerId: string) {
  const fields = {
    vehicleId: null as string | null,
    maintenanceId: null as string | null,
    oilChangeId: null as string | null,
    fuelLogId: null as string | null,
    supplierId: null as string | null,
    partStockId: null as string | null,
    serviceMotorcycleId: null as string | null,
    motorcycleFineId: null as string | null,
  };

  switch (ownerType) {
    case "vehicle":
      fields.vehicleId = ownerId;
      break;
    case "maintenance":
      fields.maintenanceId = ownerId;
      break;
    case "oil":
      fields.oilChangeId = ownerId;
      break;
    case "fuel":
      fields.fuelLogId = ownerId;
      break;
    case "supplier":
      fields.supplierId = ownerId;
      break;
    case "inventory":
      fields.partStockId = ownerId;
      break;
    case "motorcycle":
      fields.serviceMotorcycleId = ownerId;
      break;
    case "fine":
      fields.motorcycleFineId = ownerId;
      break;
  }

  return fields;
}

function normalizeAttachment(input: Attachment): Attachment {
  return {
    ...input,
    description: input.description ?? null,
    module: input.module || attachmentModuleLabel(input.ownerType),
    ...attachmentRelationFields(input.ownerType, input.ownerId),
  };
}

function attachmentDbData(attachment: Attachment): Prisma.AttachmentUncheckedCreateInput {
  return {
    ...attachment,
    createdAt: new Date(attachment.createdAt),
  } as Prisma.AttachmentUncheckedCreateInput;
}

export async function createAttachmentRecord(input: Omit<Attachment, "id" | "createdAt">) {
  const attachment = normalizeAttachment({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  });

  return withDb(
    async () => {
      const saved = await prisma.attachment.create({ data: attachmentDbData(attachment) });
      return {
        ...attachment,
        id: saved.id,
        createdAt: saved.createdAt.toISOString(),
      };
    },
    () => {
      demoDataset.attachments.unshift(attachment);
      persistLocalDataset();
      return attachment;
    },
  );
}

export async function deleteAttachment(id: string) {
  return withDb(
    async () => {
      const attachment = await prisma.attachment.delete({ where: { id } });
      const filePath = getUploadFilePath(attachment.url.split("/").at(-1) ?? "");
      if (!IS_SERVERLESS && existsSync(filePath)) {
        unlinkSync(filePath);
      }
      return { id };
    },
    () => {
      const index = demoDataset.attachments.findIndex((attachment) => attachment.id === id);
      if (index === -1) {
        throw new Error("Anexo nao encontrado.");
      }
      const [attachment] = demoDataset.attachments.splice(index, 1);
      const filePath = getUploadFilePath(attachment.url.split("/").at(-1) ?? "");
      if (!IS_SERVERLESS && existsSync(filePath)) {
        unlinkSync(filePath);
      }
      persistLocalDataset();
      return { id };
    },
  );
}

export async function restoreDeletedItem(id: string, userName: string) {
  return withDb(
    async () => {
      const item = await prisma.deletedItem.findUniqueOrThrow({ where: { id } });
      if (item.entity === "Estoque") {
        await prisma.partStock.update({
          where: { id: item.entityId },
          data: { deletedAt: null, deletedBy: null },
        });
      }
      await prisma.deletedItem.update({
        where: { id },
        data: { restoredAt: new Date() },
      });
      return { id, restored: true };
    },
    () => {
      const item = demoDataset.deletedItems.find((deleted) => deleted.id === id);
      if (!item) {
        throw new Error("Item removido nao encontrado.");
      }

      if (item.entity === "Estoque") {
        const part = item.payload as PartStock;
        if (!demoDataset.partStock.some((current) => current.id === part.id)) {
          demoDataset.partStock.unshift(part);
        }
      }

      demoDataset.deletedItems = demoDataset.deletedItems.filter((deleted) => deleted.id !== id);
      demoDataset.activityLogs.unshift({
        id: randomUUID(),
        userName,
        action: "RESTORE",
        entity: item.entity,
        entityId: item.entityId,
        description: `${item.label} restaurado da lixeira.`,
        createdAt: new Date().toISOString(),
        module: "Lixeira",
        date: timestampParts().date,
        time: timestampParts().time,
        ipAddress: "127.0.0.1",
        device: "Navegador",
      });
      persistLocalDataset();
      return { id, restored: true };
    },
  );
}

export async function permanentlyDeleteItem(id: string) {
  return withDb(
    async () => {
      await prisma.deletedItem.update({
        where: { id },
        data: { permanentlyDeletedAt: new Date() },
      });
      return { id };
    },
    () => {
      demoDataset.deletedItems = demoDataset.deletedItems.filter((deleted) => deleted.id !== id);
      persistLocalDataset();
      return { id };
    },
  );
}

export async function search(query: string) {
  const normalized = query.trim().toLowerCase();
  const dataset = await getDataset();

  if (!normalized) {
    return [];
  }

  return [
    ...dataset.vehicles
      .filter((vehicle) =>
        [vehicle.name, vehicle.model, vehicle.plate, vehicle.driver].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
      .map((vehicle) => ({
        id: vehicle.id,
        title: vehicle.name,
        description: `${vehicle.model} • ${vehicle.plate}`,
        href: "/vehicles",
        type: "Veículo",
      })),
    ...dataset.maintenances
      .filter((maintenance) =>
        [maintenance.vehicleName, maintenance.type, maintenance.mechanic].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
      .map((maintenance) => ({
        id: maintenance.id,
        title: maintenance.vehicleName,
        description: `${maintenance.type} • ${maintenance.mechanic}`,
        href: "/maintenance",
        type: "Manutenção",
      })),
    ...dataset.partStock
      .filter((part) =>
        [part.name, part.sku, part.category, part.manufacturer, part.supplierName ?? ""].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
      .map((part) => ({
        id: part.id,
        title: part.name,
        description: `${part.sku} • ${part.quantity} em estoque`,
        href: "/inventory",
        type: "Estoque",
      })),
    ...dataset.serviceMotorcycles
      .filter((motorcycle) =>
        [motorcycle.model, motorcycle.brand, motorcycle.plate, motorcycle.driver].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
      .map((motorcycle) => ({
        id: motorcycle.id,
        title: `${motorcycle.brand} ${motorcycle.model}`,
        description: `${motorcycle.plate} - ${motorcycle.driver}`,
        href: "/service-motorcycles",
        type: "Moto",
      })),
    ...dataset.suppliers
      .filter((supplier) =>
        [supplier.name, supplier.contact, supplier.email].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
      .map((supplier) => ({
        id: supplier.id,
        title: supplier.name,
        description: `${supplier.contact} • ${supplier.phone}`,
        href: "/suppliers",
        type: "Fornecedor",
      })),
  ].slice(0, 8);
}

export async function getBackup() {
  return {
    generatedAt: new Date().toISOString(),
    source: isDatabaseConfigured() ? "postgresql" : "local-persistent-store",
    data: await getDataset(),
  };
}
