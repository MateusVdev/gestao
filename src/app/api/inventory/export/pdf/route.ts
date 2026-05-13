import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { currency } from "@/lib/format";
import { createLinesPdf } from "@/lib/pdf";
import { getInventory, getSettings, getStockMovements } from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const [inventory, settings, movements] = await Promise.all([
    getInventory(),
    getSettings(),
    getStockMovements(),
  ]);

  const money = (value: number) => currency(value, settings.currency);
  const total = inventory.partStock.reduce((sum, part) => sum + part.quantity * part.unitCost, 0);
  const lines = [
    `Relatorio de estoque ${settings.cooperativeName}`,
    `Valor total em estoque: ${money(total)}`,
    `Pecas cadastradas: ${inventory.partStock.length}`,
    `Movimentacoes: ${movements.length}`,
    "",
    "Itens principais",
    ...inventory.partStock
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
