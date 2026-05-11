import { InventoryManager } from "@/components/inventory-manager";
import { PageHeader } from "@/components/page";
import { getDataset } from "@/lib/repository";

export default async function InventoryPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Controle de estoque de peças com fornecedor, custo, quantidade mínima e alertas de reposição."
        title="Estoque de peças"
      />
      <InventoryManager
        partStock={dataset.partStock}
        stockMovements={dataset.stockMovements}
        suppliers={dataset.suppliers}
      />
    </>
  );
}
