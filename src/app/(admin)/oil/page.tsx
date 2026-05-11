import { PageHeader } from "@/components/page";
import { OilManager } from "@/components/managers";
import { getDataset } from "@/lib/repository";

export default async function OilPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Controle de trocas de óleo com tipo, litros, valor por litro e cálculo automático."
        title="Controle de óleo"
      />
      <OilManager oilChanges={dataset.oilChanges} vehicles={dataset.vehicles} />
    </>
  );
}
