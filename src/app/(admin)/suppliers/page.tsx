import { SupplierManager } from "@/components/managers";
import { PageHeader } from "@/components/page";
import { getDataset } from "@/lib/repository";

export default async function SuppliersPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Cadastro de fornecedores para compras, reposição e histórico operacional."
        title="Fornecedores"
      />
      <SupplierManager suppliers={dataset.suppliers} />
    </>
  );
}
