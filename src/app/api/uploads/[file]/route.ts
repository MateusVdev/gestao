import { existsSync, readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { getUploadFilePath } from "@/lib/repository";

export const runtime = "nodejs";

function contentType(fileName: string) {
  if (fileName.endsWith(".pdf")) return "application/pdf";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
  if (fileName.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  const filePath = getUploadFilePath(file);

  if (!existsSync(filePath)) {
    return NextResponse.json({ message: "Arquivo nao encontrado." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(readFileSync(filePath)), {
    headers: {
      "Content-Type": contentType(file),
      "Content-Disposition": `inline; filename="${file}"`,
    },
  });
}
