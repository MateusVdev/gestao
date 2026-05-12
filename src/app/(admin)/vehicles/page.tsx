import { PageHeader } from "@/components/page";
import { VehicleManager } from "@/components/managers";
import { getVehicles } from "@/lib/repository";

export default async function VehiclesPage() {
  const vehicles = await getVehicles();

  return (
    <>
      <PageHeader
        description="Cadastro completo da frota com status, motorista, placa, ano, entrada e quilometragem."
        title="Cadastro de veículos"
      />
      <VehicleManager vehicles={vehicles} />
    </>
  );
}
