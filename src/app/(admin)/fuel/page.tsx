import { PageHeader } from "@/components/page";
import { FuelManager } from "@/components/managers";
import { getFuelLogs, getVehicles } from "@/lib/repository";

export default async function FuelPage() {
  const [fuelLogs, vehicles] = await Promise.all([
    getFuelLogs(),
    getVehicles(),
  ]);

  return (
    <>
      <PageHeader
        description="Controle de combustível por veículo, posto, litros, preço e despesa total."
        title="Controle de combustível"
      />
      <FuelManager fuelLogs={fuelLogs} vehicles={vehicles} />
    </>
  );
}
