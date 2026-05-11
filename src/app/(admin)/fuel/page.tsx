import { PageHeader } from "@/components/page";
import { FuelManager } from "@/components/managers";
import { getDataset } from "@/lib/repository";

export default async function FuelPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Controle de combustível por veículo, posto, litros, preço e despesa total."
        title="Controle de combustível"
      />
      <FuelManager fuelLogs={dataset.fuelLogs} vehicles={dataset.vehicles} />
    </>
  );
}
