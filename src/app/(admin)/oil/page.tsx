import { PageHeader } from "@/components/page";
import { OilManager } from "@/components/managers";
import { getOilChanges, getVehicles } from "@/lib/repository";

export default async function OilPage() {
  const [oilChanges, vehicles] = await Promise.all([
    getOilChanges(),
    getVehicles(),
  ]);

  return (
    <>
      <PageHeader
        description="Controle de trocas de óleo com tipo, litros, valor por litro e cálculo automático."
        title="Controle de óleo"
      />
      <OilManager oilChanges={oilChanges} vehicles={vehicles} />
    </>
  );
}
