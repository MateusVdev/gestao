import { PageHeader } from "@/components/page";
import { VehicleManager } from "@/components/managers";
import { getDataset } from "@/lib/repository";

export default async function VehiclesPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Cadastro completo da frota com status, motorista, placa, ano, entrada e quilometragem."
        title="Cadastro de veículos"
      />
      <VehicleManager vehicles={dataset.vehicles} />
    </>
  );
}
