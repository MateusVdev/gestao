import { FinanceManager } from "@/components/managers";
import { PageHeader } from "@/components/page";
import { getDataset } from "@/lib/repository";

export default async function FinancePage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Entradas, saídas, lucro ou prejuízo, comparação mensal e despesas por veículo."
        title="Controle financeiro"
      />
      <FinanceManager entries={dataset.financialEntries} vehicles={dataset.vehicles} />
    </>
  );
}
