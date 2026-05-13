import { AttachmentsManager } from "@/components/attachments-manager";
import { PageHeader } from "@/components/page";
import {
  getAttachments,
  getFuelLogs,
  getInventory,
  getMaintenances,
  getMotorcycleFines,
  getOilChanges,
  getServiceMotorcycles,
  getSuppliers,
  getVehicles,
} from "@/lib/repository";

export default async function AttachmentsPage() {
  const [
    attachments,
    vehicles,
    maintenances,
    oilChanges,
    fuelLogs,
    fines,
    suppliers,
    inventory,
    motorcycles,
  ] = await Promise.all([
    getAttachments(),
    getVehicles(),
    getMaintenances(),
    getOilChanges(),
    getFuelLogs(),
    getMotorcycleFines(),
    getSuppliers(),
    getInventory(),
    getServiceMotorcycles(),
  ]);

  const partialDataset = {
    attachments,
    vehicles,
    maintenances,
    oilChanges,
    fuelLogs,
    motorcycleFines: fines,
    suppliers,
    partStock: inventory.partStock,
    serviceMotorcycles: motorcycles,
  };

  return (
    <>
      <PageHeader
        description="Upload e gestao de fotos, PDFs, notas fiscais e comprovantes vinculados a manutencao, multas, fornecedores, estoque, veiculos e motos."
        title="Anexos"
      />
      <AttachmentsManager dataset={partialDataset as any} />
    </>
  );
}
