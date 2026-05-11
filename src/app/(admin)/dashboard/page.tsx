import { DashboardRealtime } from "@/components/dashboard-realtime";
import { PageHeader } from "@/components/page";
import { getDashboard } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();

  return (
    <>
      <PageHeader
        description="Visão executiva em tempo real da frota, entradas, saídas, manutenção e faturamento da cooperativa."
        title="Dashboard principal"
      />
      <DashboardRealtime initialData={data} />
    </>
  );
}
