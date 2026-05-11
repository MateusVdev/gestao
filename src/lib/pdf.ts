import { currency } from "@/lib/format";
import type { ReportData } from "@/lib/types";

function clean(value: string) {
  return value.replaceAll("•", "-").replace(/[^\x20-\x7EÀ-ÿ]/g, "");
}

function escapePdf(value: string) {
  return clean(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function reportLines(report: ReportData, currencyCode?: string | null) {
  const money = (value: number) => currency(value, currencyCode);

  return [
    report.title,
    `Periodo: ${report.period}`,
    report.filters.vehicle ? `Veiculo: ${report.filters.vehicle}` : "Veiculo: todos",
    report.filters.from || report.filters.to
      ? `Filtro de datas: ${report.filters.from ?? "inicio"} a ${report.filters.to ?? "fim"}`
      : "Filtro de datas: historico completo",
    "",
    `Entradas: ${money(report.totals.income)}`,
    `Saidas: ${money(report.totals.expenses)}`,
    `Resultado: ${money(report.totals.profit)}`,
    `Manutencoes: ${money(report.totals.maintenances)}`,
    `Combustivel: ${money(report.totals.fuel)}`,
    `Oleo: ${money(report.totals.oil)}`,
    "",
    "Veiculos com maior despesa",
    ...report.vehicles.slice(0, 10).map((vehicle) => `${vehicle.name}: ${money(vehicle.expense)}`),
    "",
    "Pecas mais utilizadas",
    ...report.parts
      .slice(0, 10)
      .map((part) => `${part.name}: ${part.quantity} un. - ${money(part.value)}`),
  ];
}

export function createReportPdf(report: ReportData, currencyCode?: string | null) {
  return createLinesPdf(reportLines(report, currencyCode).slice(0, 42));
}

export function createLinesPdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 16 Tf",
    "50 792 Td",
    `(${escapePdf(lines[0] ?? "Relatorio")}) Tj`,
    "/F1 10 Tf",
    ...lines.slice(1).flatMap((line) => ["0 -17 Td", `(${escapePdf(line)}) Tj`]),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
