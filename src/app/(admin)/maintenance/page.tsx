import { PageHeader } from "@/components/page";
import { MaintenanceManager } from "@/components/managers";
import { getDataset } from "@/lib/repository";

export default async function MaintenancePage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Controle de manutenção com peças utilizadas, quantidade, valor unitário, total e observações."
        title="Controle de manutenção"
      />
      <MaintenanceManager
        maintenances={dataset.maintenances}
        partStock={dataset.partStock}
        vehicles={dataset.vehicles}
      />
    </>
  );
}
