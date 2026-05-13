"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArchiveRestore,
  AlertTriangle,
  Bell,
  Bike,
  Boxes,
  ChartNoAxesCombined,
  ChevronDown,
  CheckCircle2,
  Droplets,
  FileSpreadsheet,
  Fuel,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Paperclip,
  Search,
  Settings,
  ShieldCheck,
  ScrollText,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { SettingsProvider, useAppSettings } from "@/components/settings-context";
import { cn } from "@/lib/format";
import type { AppNotification, AppUser, CompanySettings } from "@/lib/types";

type SearchResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  type: string;
};

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Veículos", icon: Truck },
  { href: "/maintenance", label: "Manutenção", icon: Wrench },
  { href: "/oil", label: "Óleo", icon: Droplets },
  { href: "/finance", label: "Financeiro", icon: ChartNoAxesCombined },
  { href: "/inventory", label: "Estoque", icon: Boxes },
  { href: "/service-motorcycles", label: "Motos de Servico", icon: Bike },
  { href: "/suppliers", label: "Fornecedores", icon: Users },
  { href: "/fuel", label: "Combustível", icon: Fuel },
  { href: "/reports", label: "Relatórios", icon: FileSpreadsheet },
  { href: "/logs", label: "Logs de atividades", icon: ScrollText },
  { href: "/attachments", label: "Anexos", icon: Paperclip },
  { href: "/trash", label: "Itens removidos", icon: ArchiveRestore },
  { href: "/settings", label: "Configurações", icon: Settings },
];

function typeClass(type: AppNotification["type"]) {
  const classes: Record<AppNotification["type"], string> = {
    INFO: "bg-sky-400/12 text-sky-200",
    WARNING: "bg-amber-400/12 text-amber-200",
    DANGER: "bg-rose-400/12 text-rose-200",
    SUCCESS: "bg-emerald-400/12 text-emerald-200",
  };

  return classes[type];
}

function priorityLabel(priority: AppNotification["priority"]) {
  const labels: Record<AppNotification["priority"], string> = {
    LOW: "Baixa",
    MEDIUM: "Media",
    HIGH: "Alta",
    CRITICAL: "Critica",
  };
  return labels[priority];
}

function priorityClass(priority: AppNotification["priority"]) {
  const classes: Record<AppNotification["priority"], string> = {
    LOW: "text-emerald-400",
    MEDIUM: "text-sky-400",
    HIGH: "text-amber-400",
    CRITICAL: "text-rose-400",
  };
  return classes[priority];
}

function toastIcon(type: AppNotification["type"]) {
  const icons = {
    INFO: Info,
    WARNING: AlertTriangle,
    DANGER: AlertTriangle,
    SUCCESS: CheckCircle2,
  };

  return icons[type];
}

export function AppShell({
  children,
  notifications: initialNotifications,
  settings,
  user,
}: {
  children: React.ReactNode;
  notifications: AppNotification[];
  settings: CompanySettings;
  user: AppUser;
}) {
  return (
    <SettingsProvider initialSettings={settings}>
      <AppShellFrame initialNotifications={initialNotifications} user={user}>
        {children}
      </AppShellFrame>
    </SettingsProvider>
  );
}

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CF"
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  const settings = useAppSettings();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-teal-300 font-black text-zinc-950">
        {settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full object-cover" src={settings.logoUrl} />
        ) : (
          initials(settings.cooperativeName)
        )}
      </div>
      {!compact ? (
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{settings.cooperativeName}</p>
          <p className="truncate text-xs uppercase tracking-[0.18em] text-zinc-500">
            Administracao
          </p>
        </div>
      ) : null}
    </div>
  );
}

function AppShellFrame({
  children,
  initialNotifications,
  user,
}: {
  children: React.ReactNode;
  initialNotifications: AppNotification[];
  user: AppUser;
}) {
  const settings = useAppSettings();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const knownNotificationIds = useRef(new Set(initialNotifications.map((item) => item.id)));

  const activeNotifications = useMemo(
    () => notifications.filter((n) => n.status !== "RESOLVED"),
    [notifications],
  );

  const unread = useMemo(
    () => activeNotifications.filter((notification) => notification.status === "UNREAD").length,
    [activeNotifications],
  );

  useEffect(() => {
    if (searchValue.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchValue)}`, {
        signal: controller.signal,
      }).catch(() => null);

      if (response?.ok) {
        setResults(await response.json());
        setSearchOpen(true);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [searchValue]);

  useEffect(() => {
    let fetching = false;
    const interval = window.setInterval(async () => {
      if (fetching) return;
      fetching = true;

      try {
        const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
        if (!response?.ok) {
          return;
        }

        const nextNotifications = (await response.json()) as AppNotification[];
        const fresh = nextNotifications.filter(
          (notification) => !knownNotificationIds.current.has(notification.id) && notification.status === "UNREAD",
        );

        nextNotifications.forEach((notification) => knownNotificationIds.current.add(notification.id));
        if (fresh.length) {
          setToasts((items) => [...fresh.slice(0, 3), ...items].slice(0, 4));
        }
        setNotifications(nextNotifications);
      } finally {
        fetching = false;
      }
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToasts((items) => items.slice(0, -1));
    }, 5200);

    return () => window.clearTimeout(timeout);
  }, [toasts]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function markRead(notification: AppNotification) {
    if (notification.status === "UNREAD") {
      setNotifications((items) =>
        items.map((n) =>
          n.id === notification.id ? { ...n, status: "READ" as const } : n,
        ),
      );
      await fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" });
    }

    if (notification.link) {
      router.push(notification.link);
      setNotificationsOpen(false);
    }
  }

  const sidebar = (
    <aside className="flex h-full w-[280px] flex-col border-r border-white/10 bg-[#0b0f0d]/96">
      <div className="flex h-20 items-center gap-3 px-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-teal-300 font-black text-zinc-950">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={settings.logoUrl} />
          ) : (
            initials(settings.cooperativeName)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{settings.cooperativeName}</p>
          <p className="truncate text-xs uppercase tracking-[0.18em] text-zinc-500">
            Administração
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              className={cn(
                "flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm transition",
                active
                  ? "bg-teal-300 text-zinc-950"
                  : "text-zinc-400 hover:bg-white/7 hover:text-white",
              )}
              href={item.href}
              key={item.href}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-[8px] border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
          <ShieldCheck size={17} className="text-teal-200" />
          Sessão protegida
        </div>
        <p className="text-xs leading-5 text-zinc-500">
          Perfil administrativo com autenticação por sessão e controle de acesso.
        </p>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block">{sidebar}</div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/65"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
          <div className="relative h-full">{sidebar}</div>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070908]/88 backdrop-blur-xl">
          <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 text-zinc-300 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              title="Abrir menu"
              type="button"
            >
              <Menu size={19} />
            </button>

            <div className="min-w-0 lg:hidden">
              <BrandMark compact />
            </div>

            <div className="relative hidden flex-1 md:block">
              <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                className="h-11 w-full max-w-xl pl-10 pr-4 text-sm"
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchValue(value);
                  if (value.trim().length < 2) {
                    setResults([]);
                    setSearchOpen(false);
                  }
                }}
                placeholder="Buscar veículos, peças, fornecedores e manutenções"
                value={searchValue}
              />
              {searchOpen && results.length > 0 ? (
                <div className="absolute top-13 left-0 w-full max-w-xl overflow-hidden rounded-[8px] border border-white/10 bg-[#111614] shadow-2xl">
                  {results.map((result) => (
                    <Link
                      className="block border-b border-white/6 px-4 py-3 transition last:border-0 hover:bg-white/[0.05]"
                      href={result.href}
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchValue("");
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{result.title}</p>
                        <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] text-zinc-400">
                          {result.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{result.description}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button
                  className="relative grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 text-zinc-300 transition hover:bg-white/7 hover:text-white"
                  onClick={() => setNotificationsOpen((value) => !value)}
                  title="Notificações"
                  type="button"
                >
                  <Bell size={18} />
                  {unread ? (
                    <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-400 px-1 text-[11px] font-bold text-zinc-950">
                      {unread}
                    </span>
                  ) : null}
                </button>

                {notificationsOpen ? (
                  <div className="absolute top-12 right-0 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-[8px] border border-white/10 bg-[#111614] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">Notificações</p>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Alertas Operacionais</p>
                      </div>
                      <button
                        className="grid h-8 w-8 place-items-center rounded-[8px] text-zinc-500 transition hover:bg-white/7 hover:text-white"
                        onClick={() => setNotificationsOpen(false)}
                        title="Fechar"
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="max-h-[480px] overflow-auto">
                      {activeNotifications.length ? (
                        activeNotifications.slice(0, 10).map((notification) => (
                          <button
                            className="block w-full border-b border-white/6 px-4 py-4 text-left transition last:border-0 hover:bg-white/[0.04]"
                            key={notification.id}
                            onClick={() => markRead(notification)}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span className="text-sm font-bold text-white">
                                  {notification.title}
                                </span>
                                <div className="mt-1 flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                      typeClass(notification.type),
                                    )}
                                  >
                                    {notification.status === "READ" ? "Lida" : "Nova"}
                                  </span>
                                  <span className={cn("text-[10px] font-bold uppercase", priorityClass(notification.priority))}>
                                    • Prioridade {priorityLabel(notification.priority)}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 h-2 w-2 rounded-full bg-teal-400 animate-pulse" style={{ opacity: notification.status === "UNREAD" ? 1 : 0 }} />
                            </div>
                            <p className="mt-2 text-xs leading-5 text-zinc-400 line-clamp-2">
                              {notification.message}
                            </p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-12 text-center">
                          <Bell className="mx-auto text-zinc-700 mb-3" size={32} />
                          <p className="text-sm text-zinc-500">Nenhuma notificacao pendente.</p>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-white/10 bg-white/[0.02] p-2">
                       <Link 
                        href="/logs" 
                        className="flex h-9 w-full items-center justify-center rounded-[6px] text-xs font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
                        onClick={() => setNotificationsOpen(false)}
                       >
                         Ver Historico de Atividades
                       </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.03] py-1.5 pr-2 pl-3 sm:flex">
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-zinc-500">{user.role}</p>
                </div>
                <ChevronDown size={16} className="text-zinc-500" />
              </div>

              <button
                className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 text-zinc-300 transition hover:bg-white/7 hover:text-white"
                onClick={logout}
                title="Sair"
                type="button"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main
          className="min-w-0 px-3 py-5 sm:px-6 lg:px-8"
          key={`${settings.cooperativeName}:${settings.logoUrl ?? ""}:${settings.currency}:${settings.theme}`}
        >
          {children}
        </main>
      </div>
      <div className="fixed right-4 bottom-4 z-60 grid w-[min(380px,calc(100vw-2rem))] gap-3">
        {toasts.map((toast) => {
          const Icon = toastIcon(toast.type);

          return (
            <div
              className="animate-in fade-in slide-in-from-bottom-3 rounded-[8px] border border-white/10 bg-[#121816]/92 p-4 shadow-2xl backdrop-blur-xl"
              key={toast.id}
            >
              <div className="flex gap-3">
                <div
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-[8px]",
                    typeClass(toast.type),
                  )}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{toast.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                    {toast.message}
                  </p>
                </div>
                <button
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-zinc-500 transition hover:bg-white/7 hover:text-white"
                  onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}
                  title="Fechar"
                  type="button"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
