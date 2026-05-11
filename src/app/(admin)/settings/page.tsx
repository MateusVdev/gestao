import { PageHeader } from "@/components/page";
import { SettingsManager } from "@/components/settings-manager";
import { isDatabaseConfigured } from "@/lib/prisma";
import { getDataset } from "@/lib/repository";

export default async function SettingsPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Identidade da cooperativa, tema, backup, notificacoes, sessao e preparacao para seguranca avancada."
        title="Configuracoes profissionais"
      />
      <SettingsManager
        backupRecords={dataset.backupRecords}
        databaseConfigured={isDatabaseConfigured()}
        initialSettings={dataset.companySettings}
      />
    </>
  );
}
