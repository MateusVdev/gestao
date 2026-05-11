import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page";
import { TrashManager } from "@/components/trash-manager";
import { getCurrentUser } from "@/lib/auth";
import { getDataset } from "@/lib/repository";

export default async function TrashPage() {
  const [dataset, user] = await Promise.all([getDataset(), getCurrentUser()]);

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <PageHeader
        description="Itens removidos permanecem restauraveis, com auditoria e exclusao definitiva restrita ao administrador."
        title="Itens removidos"
      />
      <TrashManager items={dataset.deletedItems} user={user} />
    </>
  );
}
