export type UserRole = "ADMIN" | "OPERATOR";
export type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE" | "ALERT";
export type FinancialKind = "INCOME" | "EXPENSE";
export type NotificationType = "INFO" | "WARNING" | "DANGER" | "SUCCESS";
export type StockMovementKind = "IN" | "OUT" | "ADJUSTMENT";
export type ServiceMotorcycleStatus = "GARAGE" | "IN_SERVICE" | "MAINTENANCE" | "UNAVAILABLE";
export type MaintenanceStatus = "ONGOING" | "WAITING_PARTS" | "CONCLUDED" | "CANCELED";
export type MotorcycleFinePaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type Vehicle = {
  id: string;
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

export type MaintenancePart = {
  id: string;
  partStockId?: string | null;
  name: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
};

export type MaintenanceRecord = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  date: string;
  type: string;
  mechanic: string;
  notes?: string | null;
  totalValue: number;
  status: MaintenanceStatus;
  concludedAt?: string | null;
  concludedBy?: string | null;
  parts: MaintenancePart[];
};

export type OilChange = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  oilType: string;
  liters: number;
  valuePerLiter: number;
  totalValue: number;
  date: string;
};

export type FinancialEntry = {
  id: string;
  kind: FinancialKind;
  category: string;
  description: string;
  value: number;
  date: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  serviceMotorcycleId?: string | null;
  serviceMotorcycleName?: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  document?: string | null;
};

export type PartStock = {
  id: string;
  name: string;
  category: string;
  sku: string;
  manufacturer: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  entryDate: string;
  supplierId?: string | null;
  supplierName?: string | null;
  notes?: string | null;
  lastEntryDate?: string | null;
};

export type StockMovement = {
  id: string;
  partStockId: string;
  partName: string;
  kind: StockMovementKind;
  quantity: number;
  unitCost: number;
  totalValue: number;
  date: string;
  purchaseDate?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  invoiceNumber?: string | null;
  responsibleUser: string;
  maintenanceId?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type FuelLog = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  totalValue: number;
  station: string;
  date: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  dueDate?: string | null;
  vehicleId?: string | null;
  vehicleName?: string | null;
  createdAt: string;
};

export type ServiceMotorcycle = {
  id: string;
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

export type MotorcycleFine = {
  id: string;
  motorcycleId: string;
  motorcycleName: string;
  motorcyclePlate: string;
  tripId?: string | null;
  value: number;
  paidAmount: number;
  paymentStatus: MotorcycleFinePaymentStatus;
  paidBy?: string | null;
  authorizedBy?: string | null;
  paidAt?: string | null;
  paymentNotes?: string | null;
  paymentHistory: FinePaymentHistory[];
  reason: string;
  date: string;
  notes?: string | null;
};

export type FinePaymentHistory = {
  id: string;
  paidAmount: number;
  paymentStatus: MotorcycleFinePaymentStatus;
  paidBy?: string | null;
  authorizedBy?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  changedBy: string;
  createdAt: string;
};

export type MotorcycleTrip = {
  id: string;
  motorcycleId: string;
  motorcycleName: string;
  motorcyclePlate: string;
  departureAt: string;
  returnAt?: string | null;
  driver: string;
  destination: string;
  serviceDone: string;
  quantityTransported: number;
  notes?: string | null;
  fine?: MotorcycleFine | null;
};

export type ActivityLog = {
  id: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string | null;
  description: string;
  createdAt: string;
  module?: string | null;
  date?: string | null;
  time?: string | null;
  ipAddress?: string | null;
  device?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown> | null;
};

export type AuditTrailEntry = {
  id: string;
  userName: string;
  module: string;
  entityId?: string | null;
  summary: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
};

export type AttachmentOwnerType =
  | "maintenance"
  | "oil"
  | "fuel"
  | "fine"
  | "supplier"
  | "inventory"
  | "vehicle"
  | "motorcycle";

export type Attachment = {
  id: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  ownerLabel: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedBy: string;
  description?: string | null;
  module: string;
  vehicleId?: string | null;
  maintenanceId?: string | null;
  oilChangeId?: string | null;
  fuelLogId?: string | null;
  supplierId?: string | null;
  partStockId?: string | null;
  serviceMotorcycleId?: string | null;
  motorcycleFineId?: string | null;
  createdAt: string;
};

export type DeletedItem = {
  id: string;
  entity: string;
  entityId: string;
  label: string;
  payload: unknown;
  deletedBy: string;
  deletedAt: string;
  restoredAt?: string | null;
  permanentlyDeletedAt?: string | null;
};

export type BackupRecord = {
  id: string;
  type: "AUTO" | "MANUAL" | "RESTORE";
  status: "SUCCESS" | "FAILED";
  fileName: string;
  size: number;
  source: string;
  createdBy: string;
  createdAt: string;
  message?: string | null;
};

export type CompanySettings = {
  cooperativeName: string;
  logoUrl?: string | null;
  theme: "premium-dark" | "system";
  currency: string;
  timezone: string;
  backupFrequency: "daily" | "weekly" | "manual";
  backupRetentionDays: number;
  notificationsEnabled: boolean;
  sessionTimeoutMinutes: number;
};

export type OperationalAlert = {
  id: string;
  title: string;
  description: string;
  module: string;
  targetHref?: string;
  status: "critical" | "attention" | "normal";
  createdAt: string;
};

export type AdvancedKpis = {
  averageCostPerVehicle: number;
  costPerKm: number;
  averageFuelCost: number;
  averageFineCost: number;
  mostExpensivePart?: { name: string; value: number } | null;
  topSupplier?: { name: string; value: number } | null;
  mostExpensiveVehicle?: { name: string; value: number } | null;
  operationalProfit: number;
};

export type MonthlyMetric = {
  month: string;
  income: number;
  expense: number;
  profit: number;
};

export type DailyFleetMetric = {
  isoDate: string;
  date: string;
  vehiclesIn: number;
  vehiclesOut: number;
  dailyRevenue: number;
  monthlyRevenue: number;
};

export type FinancialAnalysis = {
  status: "above" | "below" | "expected";
  monthlyAverage: number;
  differencePercent: number;
  tolerancePercent: number;
};

export type MaintenanceOverview = {
  count: number;
  vehicles: Array<{
    id: string;
    name: string;
    model: string;
    plate: string;
    driver: string;
    mileage: number;
  }>;
};

export type DashboardData = {
  metrics: {
    monthlyIncome: number;
    dailyIncome: number;
    monthlyProfit: number;
    monthlyExpenses: number;
    vehicleCount: number;
    maintenanceCount: number;
    partsUsed: number;
    inventoryValue: number;
    stockCosts: number;
    fineCosts: number;
    serviceMotorcycleCount: number;
    incomeChange: number;
    profitChange: number;
    expenseChange: number;
    currentPeriod: string;
  };
  financialAnalysis: FinancialAnalysis;
  maintenanceOverview: MaintenanceOverview;
  dailyOperations: DailyFleetMetric[];
  monthlyFinancial: MonthlyMetric[];
  vehicleExpenses: Array<{ name: string; value: number }>;
  expenseByCategory: Array<{ name: string; value: number }>;
  topParts: Array<{ name: string; quantity: number; value: number }>;
  maintenanceByType: Array<{ name: string; value: number }>;
  stockDashboard: {
    mostUsedParts: Array<{ name: string; quantity: number; value: number }>;
    monthlyPartSpend: Array<{ month: string; value: number }>;
    movementsByMonth: Array<{ month: string; entries: number; exits: number }>;
    stockValue: number;
    priceComparison: Array<{ month: string; value: number }>;
  };
  motorcycleDashboard: {
    mostUsed: Array<{ name: string; value: number }>;
    tripsByMonth: Array<{ month: string; value: number }>;
    finesByMonth: Array<{ month: string; value: number }>;
    costsByMotorcycle: Array<{ name: string; value: number }>;
    mileageByMonth: Array<{ month: string; value: number }>;
    averageServiceHours: number;
  };
  recentMaintenances: MaintenanceRecord[];
  notifications: AppNotification[];
  alerts: OperationalAlert[];
  advancedKpis: AdvancedKpis;
  lowStock: PartStock[];
};

export type ReportData = {
  title: string;
  period: string;
  filters: {
    vehicle?: string;
    from?: string;
    to?: string;
  };
  totals: {
    income: number;
    expenses: number;
    profit: number;
    maintenances: number;
    fuel: number;
    oil: number;
  };
  monthly: MonthlyMetric[];
  vehicles: Array<{ name: string; expense: number; maintenances: number }>;
  parts: Array<{ name: string; quantity: number; value: number }>;
  entries: FinancialEntry[];
};

export type Dataset = {
  users: AppUser[];
  vehicles: Vehicle[];
  maintenances: MaintenanceRecord[];
  oilChanges: OilChange[];
  financialEntries: FinancialEntry[];
  suppliers: Supplier[];
  partStock: PartStock[];
  stockMovements: StockMovement[];
  fuelLogs: FuelLog[];
  notifications: AppNotification[];
  serviceMotorcycles: ServiceMotorcycle[];
  motorcycleTrips: MotorcycleTrip[];
  motorcycleFines: MotorcycleFine[];
  activityLogs: ActivityLog[];
  auditTrail: AuditTrailEntry[];
  attachments: Attachment[];
  deletedItems: DeletedItem[];
  backupRecords: BackupRecord[];
  companySettings: CompanySettings;
};
