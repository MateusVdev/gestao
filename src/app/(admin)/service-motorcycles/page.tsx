import { ServiceMotorcyclesManager } from "@/components/service-motorcycles-manager";
import { PageHeader } from "@/components/page";
import { getDataset } from "@/lib/repository";

export default async function ServiceMotorcyclesPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Controle executivo de motos de servico, saidas, retornos, multas, custos e disponibilidade operacional."
        title="Motos de Servico"
      />
      <ServiceMotorcyclesManager
        entries={dataset.financialEntries}
        fines={dataset.motorcycleFines}
        motorcycles={dataset.serviceMotorcycles}
        trips={dataset.motorcycleTrips}
      />
    </>
  );
}
