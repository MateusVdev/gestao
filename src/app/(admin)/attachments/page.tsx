import { AttachmentsManager } from "@/components/attachments-manager";
import { PageHeader } from "@/components/page";
import { getDataset } from "@/lib/repository";

export default async function AttachmentsPage() {
  const dataset = await getDataset();

  return (
    <>
      <PageHeader
        description="Upload e gestao de fotos, PDFs, notas fiscais e comprovantes vinculados a manutencao, multas, fornecedores, estoque, veiculos e motos."
        title="Anexos"
      />
      <AttachmentsManager dataset={dataset} />
    </>
  );
}
