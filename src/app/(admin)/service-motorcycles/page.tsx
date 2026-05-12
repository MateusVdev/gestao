import { ServiceMotorcyclesManager } from "@/components/service-motorcycles-manager";
import { PageHeader } from "@/components/page";
import {
  getFinanceEntries,
  getMotorcycleFines,
  getMotorcycleTrips,
  getServiceMotorcycles,
} from "@/lib/repository";

export default async function ServiceMotorcyclesPage() {
  const [finances, fines, motorcycles, trips] = await Promise.all([
    getFinanceEntries(),
    getMotorcycleFines(),
    getServiceMotorcycles(),
    getMotorcycleTrips(),
  ]);

  return (
    <>
      <PageHeader
        description="Controle executivo de motos de servico, saidas, retornos, multas, custos e disponibilidade operacional."
        title="Motos de Servico"
      />
      <ServiceMotorcyclesManager
        entries={finances}
        fines={fines}
        motorcycles={motorcycles}
        trips={trips}
      />
    </>
  );
}
