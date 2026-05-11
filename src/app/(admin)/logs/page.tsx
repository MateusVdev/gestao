import { LogsManager } from "@/components/logs-manager";
import { PageHeader } from "@/components/page";
import { getDataset } from "@/lib/repository";

export default async function LogsPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Rastreamento completo de usuarios, acoes, modulos, data, horario, IP, dispositivo e auditoria de valores alterados."
        title="Logs de atividades"
      />
      <LogsManager auditTrail={dataset.auditTrail} logs={dataset.activityLogs} />
    </>
  );
}
