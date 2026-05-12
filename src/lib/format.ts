import { format, parseISO } from "date-fns";

export function normalizeCurrencyCode(value?: string | null) {
  const normalized = (value || "BRL").trim().toUpperCase();
  const symbolMap: Record<string, string> = {
    "R$": "BRL",
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
  };

  return symbolMap[normalized] ?? normalized;
}

export function activeCurrency() {
  if (typeof document !== "undefined") {
    const documentCurrency = document.documentElement.dataset.currency;
    if (documentCurrency) {
      return normalizeCurrencyCode(documentCurrency);
    }
  }

  if (typeof window !== "undefined") {
    return normalizeCurrencyCode(window.localStorage.getItem("coopfleet:currency"));
  }

  return "BRL";
}

export function currency(value: number, currencyCode?: string | null) {
  const code = normalizeCurrencyCode(currencyCode ?? activeCurrency());

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(value);
  }
}

export function compactCurrency(value: number, currencyCode?: string | null) {
  const code = normalizeCurrencyCode(currencyCode ?? activeCurrency());

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: code,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return currency(value, "BRL");
  }
}

export function currencySymbol(currencyCode?: string | null) {
  const code = normalizeCurrencyCode(currencyCode ?? activeCurrency());

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(0)
    .replace(/\d/g, "")
    .trim();
}

export function legacyBrlCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

export function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function percent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function date(value: string) {
  return format(parseISO(value), "dd/MM/yyyy");
}

export function monthLabel(value: string) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
  });
}

export function inputDate(value: string | Date) {
  const dateValue = value instanceof Date ? value : new Date(value);
  return dateValue.toISOString().slice(0, 10);
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    MAINTENANCE: "Em manutenção",
    INACTIVE: "Inativo",
    ALERT: "Atenção",
  };
  return labels[status] ?? status;
}

export function statusClass(status: string) {
  const classes: Record<string, string> = {
    ACTIVE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    MAINTENANCE: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    INACTIVE: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
    ALERT: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };
  return classes[status] ?? classes.INACTIVE;
}

export function motorcycleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    GARAGE: "Na garagem",
    IN_SERVICE: "Em servico",
    MAINTENANCE: "Em manutencao",
    UNAVAILABLE: "Indisponivel",
  };
  return labels[status] ?? status;
}

export function motorcycleStatusClass(status: string) {
  const classes: Record<string, string> = {
    GARAGE: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    IN_SERVICE: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    MAINTENANCE: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    UNAVAILABLE: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  };
  return classes[status] ?? classes.UNAVAILABLE;
}

export function maintenanceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ONGOING: "Em andamento",
    WAITING_PARTS: "Aguardando peça",
    CONCLUDED: "Concluída",
    CANCELED: "Cancelada",
  };
  return labels[status] ?? status;
}

export function maintenanceStatusClass(status: string) {
  const classes: Record<string, string> = {
    ONGOING: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    WAITING_PARTS: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    CONCLUDED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    CANCELED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };
  return classes[status] ?? classes.ONGOING;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function stockRisk(part: { quantity: number; minQuantity: number }) {
  if (part.quantity <= 0) {
    return "Sem estoque";
  }

  if (part.quantity <= part.minQuantity * 0.5) {
    return "Produto acabando";
  }

  if (part.quantity <= part.minQuantity) {
    return "Estoque baixo";
  }

  return "Estoque normal";
}

export function stockRiskClass(part: { quantity: number; minQuantity: number }) {
  if (part.quantity <= 0) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }

  if (part.quantity <= part.minQuantity) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
}
