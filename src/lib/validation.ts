import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const vehicleSchema = z.object({
  name: z.string().min(2),
  model: z.string().min(2),
  plate: z.string().min(5),
  year: z.coerce.number().int().min(1980).max(2100),
  driver: z.string().min(2),
  entryDate: z.string().min(8),
  exitDate: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE", "ALERT"]),
  mileage: z.coerce.number().int().min(0),
});

export const maintenanceSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.string().min(8),
  type: z.string().min(2),
  mechanic: z.string().min(2),
  notes: z.string().optional().nullable(),
  parts: z
    .array(
      z.object({
        partStockId: z.string().optional().nullable(),
        name: z.string().min(2),
        quantity: z.coerce.number().int().min(1),
        unitValue: z.coerce.number().min(0),
      }),
    )
    .min(1),
});

export const oilSchema = z.object({
  vehicleId: z.string().min(1),
  oilType: z.string().min(2),
  liters: z.coerce.number().min(0.1),
  valuePerLiter: z.coerce.number().min(0),
  date: z.string().min(8),
});

export const fuelSchema = z.object({
  vehicleId: z.string().min(1),
  fuelType: z.string().min(2),
  liters: z.coerce.number().min(0.1),
  pricePerLiter: z.coerce.number().min(0),
  station: z.string().min(2),
  date: z.string().min(8),
});

export const financialSchema = z.object({
  kind: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(2),
  description: z.string().min(2),
  value: z.coerce.number().min(0),
  date: z.string().min(8),
  vehicleId: z.string().optional().nullable(),
  serviceMotorcycleId: z.string().optional().nullable(),
});

export const supplierSchema = z.object({
  name: z.string().min(2),
  contact: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  document: z.string().optional().nullable(),
});

export const partSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  sku: z.string().min(2),
  manufacturer: z.string().min(2),
  quantity: z.coerce.number().int().min(0),
  minQuantity: z.coerce.number().int().min(0),
  unitCost: z.coerce.number().min(0),
  entryDate: z.string().min(8),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const stockEntrySchema = z.object({
  partStockId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitCost: z.coerce.number().min(0),
  date: z.string().min(8),
  purchaseDate: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  responsibleUser: z.string().min(2),
  notes: z.string().optional().nullable(),
});

export const serviceMotorcycleSchema = z.object({
  model: z.string().min(2),
  brand: z.string().min(2),
  plate: z.string().min(5),
  year: z.coerce.number().int().min(1980).max(2100),
  mileage: z.coerce.number().int().min(0),
  status: z.enum(["GARAGE", "IN_SERVICE", "MAINTENANCE", "UNAVAILABLE"]),
  driver: z.string().min(2),
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const motorcycleTripSchema = z
  .object({
    motorcycleId: z.string().min(1),
    departureAt: z.string().min(8),
    returnAt: z.string().optional().nullable(),
    driver: z.string().min(2),
    destination: z.string().min(2),
    serviceDone: z.string().min(2),
    quantityTransported: z.coerce.number().int().min(0),
    notes: z.string().optional().nullable(),
    hasFine: z.coerce.boolean().optional(),
    fineValue: z.coerce.number().optional(),
    fineReason: z.string().optional().nullable(),
    fineDate: z.string().optional().nullable(),
    fineNotes: z.string().optional().nullable(),
  })
  .superRefine((data, context) => {
    if (!data.hasFine) {
      return;
    }

    if (!data.fineReason || data.fineReason.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["fineReason"],
        message: "Informe o motivo da multa.",
      });
    }

    if (!data.fineDate) {
      context.addIssue({
        code: "custom",
        path: ["fineDate"],
        message: "Informe a data da multa.",
      });
    }

    if (!data.fineValue || data.fineValue <= 0) {
      context.addIssue({
        code: "custom",
        path: ["fineValue"],
        message: "Informe o valor da multa.",
      });
    }
  });

export const motorcycleFinePaymentSchema = z.object({
  paidAmount: z.coerce.number().min(0),
  paidBy: z.string().optional().nullable(),
  authorizedBy: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable(),
  paymentNotes: z.string().optional().nullable(),
});

export const companySettingsSchema = z.object({
  cooperativeName: z.string().min(2),
  logoUrl: z.string().optional().nullable(),
  theme: z.enum(["premium-dark", "system"]),
  currency: z.string().min(3).max(3),
  timezone: z.string().min(2),
  backupFrequency: z.enum(["daily", "weekly", "manual"]),
  backupRetentionDays: z.coerce.number().int().min(1).max(365),
  notificationsEnabled: z.coerce.boolean(),
  sessionTimeoutMinutes: z.coerce.number().int().min(15).max(1440),
});
