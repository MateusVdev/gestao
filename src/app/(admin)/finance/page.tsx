import { FinanceManager } from "@/components/managers";
import { PageHeader } from "@/components/page";
import { getFinanceEntries, getVehicles } from "@/lib/repository";

export default async function FinancePage() {
  const [entries, vehicles] = await Promise.all([
    getFinanceEntries(),
    getVehicles(),
  ]);

  return (
    <>
      <PageHeader
        description="Entradas, saídas, lucro ou prejuízo, comparação mensal e despesas por veículo."
        title="Controle financeiro"
      />
      <FinanceManager entries={entries} vehicles={vehicles} />
    </>
  );
}
