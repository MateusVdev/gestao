import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { createLinesPdf } from "@/lib/pdf";
import { getActivityLogs } from "@/lib/repository";

export async function GET() {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const logs = await getActivityLogs();
  const lines = [
    "Logs de atividades CoopFleet",
    `Registros: ${logs.length}`,
    "",
    ...logs.slice(0, 38).map((log) =>
      [
        log.date ?? log.createdAt.slice(0, 10),
        log.time ?? "00:00",
        log.userName,
        log.action,
        log.module ?? log.entity,
        log.ipAddress ?? "-",
        log.description,
      ].join(" | "),
    ),
  ];
  const pdf = createLinesPdf(lines);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="logs-coopfleet.pdf"',
    },
  });
}
