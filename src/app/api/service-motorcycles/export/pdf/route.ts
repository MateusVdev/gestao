import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { currency } from "@/lib/format";
import { createLinesPdf } from "@/lib/pdf";
import { getDataset } from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const dataset = await getDataset();
  const money = (value: number) => currency(value, dataset.companySettings.currency);
  const fineTotal = dataset.motorcycleFines.reduce((sum, fine) => sum + fine.value, 0);
  const lines = [
    `Relatorio de motos de servico ${dataset.companySettings.cooperativeName}`,
    `Motos cadastradas: ${dataset.serviceMotorcycles.length}`,
    `Saidas registradas: ${dataset.motorcycleTrips.length}`,
    `Multas: ${dataset.motorcycleFines.length}`,
    `Custo de multas: ${money(fineTotal)}`,
    "",
    "Motos",
    ...dataset.serviceMotorcycles
      .slice(0, 20)
      .map((motorcycle) => `${motorcycle.brand} ${motorcycle.model} - ${motorcycle.plate}`),
    "",
    "Multas",
    ...dataset.motorcycleFines
      .slice(0, 15)
      .map((fine) => `${fine.motorcycleName} - ${money(fine.value)} - ${fine.reason}`),
  ];
  const pdf = createLinesPdf(lines);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="motos-servico-coopfleet.pdf"',
    },
  });
}
