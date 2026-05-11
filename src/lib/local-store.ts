import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createDemoDataset } from "@/lib/demo-data";
import type { Dataset } from "@/lib/types";

const storePath = join(process.cwd(), "data", "coopfleet-store.json");

export function loadLocalDataset(): Dataset {
  if (!existsSync(storePath)) {
    const dataset = createDemoDataset();
    saveLocalDataset(dataset);
    return dataset;
  }

  try {
    return normalizeDataset(JSON.parse(readFileSync(storePath, "utf8")) as Partial<Dataset>);
  } catch {
    const dataset = createDemoDataset();
    saveLocalDataset(dataset);
    return dataset;
  }
}

function normalizeDataset(input: Partial<Dataset>): Dataset {
  const demo = createDemoDataset();
  const dataset = {
    ...demo,
    ...input,
    users: input.users ?? demo.users,
    vehicles: input.vehicles ?? demo.vehicles,
    maintenances: input.maintenances ?? demo.maintenances,
    oilChanges: input.oilChanges ?? demo.oilChanges,
    financialEntries: input.financialEntries ?? demo.financialEntries,
    suppliers: input.suppliers ?? demo.suppliers,
    partStock: input.partStock ?? demo.partStock,
    stockMovements: input.stockMovements ?? demo.stockMovements,
    fuelLogs: input.fuelLogs ?? demo.fuelLogs,
    notifications: input.notifications ?? demo.notifications,
    serviceMotorcycles: input.serviceMotorcycles ?? demo.serviceMotorcycles,
    motorcycleTrips: input.motorcycleTrips ?? demo.motorcycleTrips,
    motorcycleFines: input.motorcycleFines ?? demo.motorcycleFines,
    activityLogs: input.activityLogs ?? demo.activityLogs,
    auditTrail: input.auditTrail ?? demo.auditTrail,
    attachments: input.attachments ?? demo.attachments,
    deletedItems: input.deletedItems ?? demo.deletedItems,
    backupRecords: input.backupRecords ?? demo.backupRecords,
    companySettings: {
      ...demo.companySettings,
      ...(input.companySettings ?? {}),
    },
  };

  dataset.partStock = dataset.partStock.map((part) => ({
    ...part,
    category: part.category ?? "Geral",
    manufacturer: part.manufacturer ?? "Nao informado",
    entryDate: part.entryDate ?? new Date().toISOString().slice(0, 10),
    notes: part.notes ?? null,
    lastEntryDate: part.lastEntryDate ?? null,
  }));

  dataset.activityLogs = dataset.activityLogs.map((log) => {
    const date = log.date ?? log.createdAt.slice(0, 10);
    const time = log.time ?? (log.createdAt.includes("T") ? log.createdAt.slice(11, 16) : "00:00");

    return {
      ...log,
      module: log.module ?? log.entity,
      date,
      time,
      ipAddress: log.ipAddress ?? "127.0.0.1",
      device: log.device ?? "Navegador",
      metadata: log.metadata ?? null,
    };
  });

  dataset.motorcycleFines = dataset.motorcycleFines.map((fine) => {
    const paidAmount = Number(fine.paidAmount ?? 0);
    const paymentStatus =
      paidAmount >= fine.value && fine.value > 0
        ? "PAID"
        : paidAmount > 0
          ? "PARTIAL"
          : fine.paymentStatus ?? "PENDING";

    return {
      ...fine,
      paidAmount,
      paymentStatus,
      paidBy: fine.paidBy ?? null,
      authorizedBy: fine.authorizedBy ?? null,
      paidAt: fine.paidAt ?? null,
      paymentNotes: fine.paymentNotes ?? null,
      paymentHistory: fine.paymentHistory ?? [],
    };
  });

  dataset.motorcycleTrips = dataset.motorcycleTrips.map((trip) => ({
    ...trip,
    fine: trip.fine
      ? {
          ...trip.fine,
          paidAmount: Number(trip.fine.paidAmount ?? 0),
          paymentStatus: trip.fine.paymentStatus ?? "PENDING",
          paidBy: trip.fine.paidBy ?? null,
          authorizedBy: trip.fine.authorizedBy ?? null,
          paidAt: trip.fine.paidAt ?? null,
          paymentNotes: trip.fine.paymentNotes ?? null,
          paymentHistory: trip.fine.paymentHistory ?? [],
        }
      : trip.fine,
  }));

  dataset.attachments = dataset.attachments.map((attachment) => ({
    ...attachment,
    description: attachment.description ?? null,
    module: attachment.module ?? attachment.ownerType,
    vehicleId: attachment.vehicleId ?? (attachment.ownerType === "vehicle" ? attachment.ownerId : null),
    maintenanceId:
      attachment.maintenanceId ?? (attachment.ownerType === "maintenance" ? attachment.ownerId : null),
    oilChangeId: attachment.oilChangeId ?? (attachment.ownerType === "oil" ? attachment.ownerId : null),
    fuelLogId: attachment.fuelLogId ?? (attachment.ownerType === "fuel" ? attachment.ownerId : null),
    supplierId: attachment.supplierId ?? (attachment.ownerType === "supplier" ? attachment.ownerId : null),
    partStockId: attachment.partStockId ?? (attachment.ownerType === "inventory" ? attachment.ownerId : null),
    serviceMotorcycleId:
      attachment.serviceMotorcycleId ?? (attachment.ownerType === "motorcycle" ? attachment.ownerId : null),
    motorcycleFineId: attachment.motorcycleFineId ?? (attachment.ownerType === "fine" ? attachment.ownerId : null),
  }));

  return dataset;
}

export function saveLocalDataset(dataset: Dataset) {
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, JSON.stringify(dataset, null, 2));
}

export function getLocalStorePath() {
  return storePath;
}
