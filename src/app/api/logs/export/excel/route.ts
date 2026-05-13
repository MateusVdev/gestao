import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/api";
import { getActivityLogs, getAuditTrail } from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const [logs, auditTrail] = await Promise.all([
    getActivityLogs(),
    getAuditTrail(),
  ]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      logs.map((log) => ({
        data: log.date ?? log.createdAt.slice(0, 10),
        horario: log.time ?? "00:00",
        usuario: log.userName,
        acao: log.action,
        modulo: log.module ?? log.entity,
        ip: log.ipAddress,
        dispositivo: log.device,
        descricao: log.description,
      })),
    ),
    "Logs",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(auditTrail),
    "Auditoria",
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="logs-coopfleet.xlsx"',
    },
  });
}
