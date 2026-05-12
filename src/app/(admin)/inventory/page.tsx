import { InventoryManager } from "@/components/inventory-manager";
import { PageHeader } from "@/components/page";
import { getInventory, getStockMovements } from "@/lib/repository";

export default async function InventoryPage() {
  const [{ partStock, suppliers }, stockMovements] = await Promise.all([
    getInventory(),
    getStockMovements(),
  ]);

  return (
    <>
      <PageHeader
        description="Controle de estoque de peças com fornecedor, custo, quantidade mínima e alertas de reposição."
        title="Estoque de peças"
      />
      <InventoryManager
        partStock={partStock}
        stockMovements={stockMovements}
        suppliers={suppliers}
      />
    </>
  );
}
