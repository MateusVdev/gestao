import { LogsManager } from "@/components/logs-manager";
import { PageHeader } from "@/components/page";
import { getActivityLogs, getAuditTrail, getNotifications } from "@/lib/repository";

export default async function LogsPage() {
  const [logs, auditTrail, notifications] = await Promise.all([
    getActivityLogs(),
    getAuditTrail(),
    getNotifications(),
  ]);

  return (
    <>
      <PageHeader
        description="Rastreamento completo de usuarios, acoes, modulos, data, horario, IP, dispositivo e auditoria de valores alterados."
        title="Logs de atividades"
      />
      <LogsManager auditTrail={auditTrail} logs={logs} notifications={notifications} />
    </>
  );
}
