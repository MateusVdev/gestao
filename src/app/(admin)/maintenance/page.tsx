import { PageHeader } from "@/components/page";
import { MaintenanceManager } from "@/components/managers";
import { getInventory, getMaintenances, getVehicles } from "@/lib/repository";

export default async function MaintenancePage() {
  const [maintenances, inventory, vehicles] = await Promise.all([
    getMaintenances(),
    getInventory(),
    getVehicles(),
  ]);

  return (
    <>
      <PageHeader
        description="Controle de manutenção com peças utilizadas, quantidade, valor unitário, total e observações."
        title="Controle de manutenção"
      />
      <MaintenanceManager
        maintenances={maintenances}
        partStock={inventory.partStock}
        vehicles={vehicles}
      />
    </>
  );
}
