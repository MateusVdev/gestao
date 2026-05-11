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
  const total = dataset.partStock.reduce((sum, part) => sum + part.quantity * part.unitCost, 0);
  const lines = [
    `Relatorio de estoque ${dataset.companySettings.cooperativeName}`,
    `Valor total em estoque: ${money(total)}`,
    `Pecas cadastradas: ${dataset.partStock.length}`,
    `Movimentacoes: ${dataset.stockMovements.length}`,
    "",
    "Itens principais",
    ...dataset.partStock
      .slice(0, 30)
      .map((part) => `${part.name} - ${part.quantity} un. - ${money(part.unitCost)}`),
  ];
  const pdf = createLinesPdf(lines);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="estoque-coopfleet.pdf"',
    },
  });
}
