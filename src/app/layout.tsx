import type { Metadata } from "next";
import { getSettings } from "@/lib/repository";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: `${settings.cooperativeName} | Gestao de Cooperativa de Veiculos`,
    description: `Sistema administrativo da ${settings.cooperativeName}.`,
    icons: settings.logoUrl ? { icon: settings.logoUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();

  return (
    <html data-currency={settings.currency} data-theme={settings.theme} lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
