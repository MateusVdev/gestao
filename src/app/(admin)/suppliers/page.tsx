import { SupplierManager } from "@/components/managers";
import { PageHeader } from "@/components/page";
import { getSuppliers } from "@/lib/repository";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <>
      <PageHeader
        description="Cadastro de fornecedores para compras, reposição e histórico operacional."
        title="Fornecedores"
      />
      <SupplierManager suppliers={suppliers} />
    </>
  );
}
