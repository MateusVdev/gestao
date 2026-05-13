import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/api";
import { getMotorcycleFines, getMotorcycleTrips, getServiceMotorcycles } from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const [motorcycles, trips, fines] = await Promise.all([
    getServiceMotorcycles(),
    getMotorcycleTrips(),
    getMotorcycleFines(),
  ]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(motorcycles),
    "Motos",
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(trips), "Saidas");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(fines), "Multas");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="motos-servico-coopfleet.xlsx"',
    },
  });
}
