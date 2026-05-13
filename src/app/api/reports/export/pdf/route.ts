import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { createReportPdf } from "@/lib/pdf";
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
  const pdf = createReportPdf(report, settings.currency);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${settings.cooperativeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf"`,
    },
  });
}
