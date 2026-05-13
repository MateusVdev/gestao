import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/api";
import { getReport, getSettings } from "@/lib/repository";

export async function GET(request: Request) {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const url = new URL(request.url);
  const [report, settings] = await Promise.all([
    getReport({
      vehicleId: url.searchParams.get("vehicleId") || undefined,
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      annual: url.searchParams.get("period") === "annual",
    }),
    getSettings(),
  ]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      {
        cooperativa: settings.cooperativeName,
        moeda: settings.currency,
        relatório: report.title,
        entradas: report.totals.income,
        saídas: report.totals.expenses,
        resultado: report.totals.profit,
        manutenções: report.totals.maintenances,
        combustível: report.totals.fuel,
        óleo: report.totals.oil,
      },
    ]),
    "Resumo",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(report.entries),
    "Histórico financeiro",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(report.vehicles),
    "Despesas por veículo",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(report.parts),
    "Peças utilizadas",
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="relatorio-coopfleet.xlsx"',
    },
  });
}
