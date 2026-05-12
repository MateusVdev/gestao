import { PageHeader } from "@/components/page";
import { SettingsManager } from "@/components/settings-manager";
import { isDatabaseConfigured } from "@/lib/prisma";
import { getBackupRecords, getSettings } from "@/lib/repository";

export default async function SettingsPage() {
  const [settings, backupRecords] = await Promise.all([
    getSettings(),
    getBackupRecords(),
  ]);

  return (
    <>
      <PageHeader
        description="Identidade da cooperativa, tema, backup, notificacoes, sessao e preparacao para seguranca avancada."
        title="Configuracoes profissionais"
      />
      <SettingsManager
        backupRecords={backupRecords}
        databaseConfigured={isDatabaseConfigured()}
        initialSettings={settings}
      />
    </>
  );
}
