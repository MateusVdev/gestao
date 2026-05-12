"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CompanySettings } from "@/lib/types";

export const defaultCompanySettings: CompanySettings = {
  cooperativeName: "CoopFleet",
  logoUrl: "",
  theme: "premium-dark",
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  backupFrequency: "daily",
  backupRetentionDays: 30,
  notificationsEnabled: true,
  sessionTimeoutMinutes: 480,
};

const SettingsContext = createContext<CompanySettings>(defaultCompanySettings);

function safeSettings(settings: CompanySettings): CompanySettings {
  return {
    ...defaultCompanySettings,
    ...settings,
    cooperativeName: settings.cooperativeName?.trim() || defaultCompanySettings.cooperativeName,
    currency: settings.currency || defaultCompanySettings.currency,
    theme: settings.theme === "system" ? "system" : "premium-dark",
  };
}

export function applyClientSettings(settings: CompanySettings) {
  if (typeof window === "undefined") {
    return;
  }

  const next = safeSettings(settings);
  document.documentElement.dataset.theme = next.theme;
  document.documentElement.dataset.currency = next.currency;
  document.title = `${next.cooperativeName} | Gestao de Cooperativa de Veiculos`;
  window.localStorage.setItem("coopfleet:settings", JSON.stringify(next));
  window.localStorage.setItem("coopfleet:currency", next.currency);
}

export function broadcastSettings(settings: CompanySettings) {
  applyClientSettings(settings);
  window.dispatchEvent(new CustomEvent<CompanySettings>("coopfleet:settings-updated", {
    detail: safeSettings(settings),
  }));
}

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings: CompanySettings;
}) {
  const [settings, setSettings] = useState(() => safeSettings(initialSettings));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      applyClientSettings(settings);
    }
  }, [settings, mounted]);

  useEffect(() => {
    function onUpdated(event: Event) {
      const detail = (event as CustomEvent<CompanySettings>).detail;
      if (detail) {
        setSettings(safeSettings(detail));
      }
    }

    if (mounted) {
      window.addEventListener("coopfleet:settings-updated", onUpdated);
    }
    return () => window.removeEventListener("coopfleet:settings-updated", onUpdated);
  }, [mounted]);

  const value = useMemo(() => settings, [settings]);

  if (!mounted) {
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(SettingsContext);
}

export function CooperativeNameLabel() {
  const settings = useAppSettings();

  return <>{settings.cooperativeName}</>;
}
