import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  demoFinancialEntries,
  demoFuelLogs,
  demoMaintenances,
  demoMotorcycleFines,
  demoMotorcycleTrips,
  demoNotifications,
  demoOilChanges,
  demoPartStock,
  demoServiceMotorcycles,
  demoStockMovements,
  demoSuppliers,
  demoVehicles,
  demoActivityLogs,
  demoAuditTrail,
  demoCompanySettings,
} from "../src/lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.backupRecord.deleteMany();
  await prisma.deletedItem.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.auditTrail.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.motorcycleFine.deleteMany();
  await prisma.motorcycleTrip.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.financialEntry.deleteMany();
  await prisma.oilChange.deleteMany();
  await prisma.maintenancePart.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.serviceMotorcycle.deleteMany();
  await prisma.partStock.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      id: "user-admin",
      name: "Administrador",
      email: "admin@coopfleet.com",
      passwordHash: await bcrypt.hash("admin123", 12),
      role: "ADMIN",
    },
  });

  for (const supplier of demoSuppliers) {
    await prisma.supplier.create({
      data: {
        id: supplier.id,
        name: supplier.name,
        contact: supplier.contact,
        email: supplier.email,
        phone: supplier.phone,
        document: supplier.document,
      },
    });
  }

  for (const vehicle of demoVehicles) {
    await prisma.vehicle.create({
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

  for (const part of demoPartStock) {
    await prisma.partStock.create({
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

  for (const maintenance of demoMaintenances) {
    await prisma.maintenance.create({
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

  for (const oilChange of demoOilChanges) {
    await prisma.oilChange.create({
      data: {
        id: oilChange.id,
        vehicleId: oilChange.vehicleId,
        oilType: oilChange.oilType,
        liters: oilChange.liters,
        valuePerLiter: oilChange.valuePerLiter,
        totalValue: oilChange.totalValue,
        date: new Date(oilChange.date),
      },
    });
  }

  for (const fuel of demoFuelLogs) {
    await prisma.fuelLog.create({
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

  for (const motorcycle of demoServiceMotorcycles) {
    await prisma.serviceMotorcycle.create({
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

  for (const trip of demoMotorcycleTrips) {
    await prisma.motorcycleTrip.create({
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

  for (const fine of demoMotorcycleFines) {
    await prisma.motorcycleFine.create({
      data: {
        id: fine.id,
        serviceMotorcycleId: fine.motorcycleId,
        tripId: fine.tripId,
        value: fine.value,
        paidAmount: fine.paidAmount,
        paymentStatus: fine.paymentStatus,
        paidBy: fine.paidBy,
        authorizedBy: fine.authorizedBy,
        paidAt: fine.paidAt ? new Date(fine.paidAt) : null,
        paymentNotes: fine.paymentNotes,
        paymentHistory: fine.paymentHistory,
        reason: fine.reason,
        date: new Date(fine.date),
        notes: fine.notes,
      },
    });
  }

  for (const movement of demoStockMovements) {
    await prisma.stockMovement.create({
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

  for (const entry of demoFinancialEntries) {
    await prisma.financialEntry.create({
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

  for (const notification of demoNotifications) {
    await prisma.notification.create({
      data: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        status: notification.status,
        priority: notification.priority,
        dueDate: notification.dueDate ? new Date(notification.dueDate) : null,
        vehicleId: notification.vehicleId,
        createdAt: new Date(notification.createdAt),
      },
    });
  }

  for (const log of demoActivityLogs) {
    await prisma.activityLog.create({
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
      },
    });
  }

  for (const audit of demoAuditTrail) {
    await prisma.auditTrail.create({
      data: {
        id: audit.id,
        userName: audit.userName,
        module: audit.module,
        entityId: audit.entityId,
        summary: audit.summary,
        oldValue: audit.oldValue as object,
        newValue: audit.newValue as object,
        createdAt: new Date(audit.createdAt),
      },
    });
  }

  await prisma.appSetting.create({
    data: {
      id: "default",
      ...demoCompanySettings,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
