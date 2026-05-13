import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { currency } from "@/lib/format";
import { createLinesPdf } from "@/lib/pdf";
import {
  getMotorcycleFines,
  getMotorcycleTrips,
  getServiceMotorcycles,
  getSettings,
} from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const [settings, motorcycles, trips, fines] = await Promise.all([
    getSettings(),
    getServiceMotorcycles(),
    getMotorcycleTrips(),
    getMotorcycleFines(),
  ]);

  const money = (value: number) => currency(value, settings.currency);
  const fineTotal = fines.reduce((sum, fine) => sum + fine.value, 0);
  const lines = [
    `Relatorio de motos de servico ${settings.cooperativeName}`,
    `Motos cadastradas: ${motorcycles.length}`,
    `Saidas registradas: ${trips.length}`,
    `Multas: ${fines.length}`,
    `Custo de multas: ${money(fineTotal)}`,
    "",
    "Motos",
    ...motorcycles
      .slice(0, 20)
      .map((motorcycle) => `${motorcycle.brand} ${motorcycle.model} - ${motorcycle.plate}`),
    "",
    "Multas",
    ...fines
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
