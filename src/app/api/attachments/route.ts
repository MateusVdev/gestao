import { NextResponse } from "next/server";
import { handleApiError, requestAuditMeta, requireSession } from "@/lib/api";
import {
  createAttachmentRecord,
  getAttachments,
  recordActivity,
  uploadFile,
} from "@/lib/repository";
import type { AttachmentOwnerType } from "@/lib/types";

const ownerTypes = new Set([
  "maintenance",
  "oil",
  "fuel",
  "fine",
  "supplier",
  "inventory",
  "vehicle",
  "motorcycle",
]);

export async function GET(request: Request) {
  const { response } = await requireSession();

  if (response) {
    return response;
  }

  const url = new URL(request.url);
  const ownerType = url.searchParams.get("ownerType");
  const ownerId = url.searchParams.get("ownerId");
  const attachments = await getAttachments();

  return NextResponse.json(
    attachments.filter((attachment) => {
      const sameType = !ownerType || attachment.ownerType === ownerType;
      const sameOwner = !ownerId || attachment.ownerId === ownerId;
      return sameType && sameOwner;
    }),
  );
}

export async function POST(request: Request) {
  const { user, response } = await requireSession();

  if (response || !user) {
    return response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const ownerType = String(formData.get("ownerType") ?? "");
    const ownerId = String(formData.get("ownerId") ?? "");
    const ownerLabel = String(formData.get("ownerLabel") ?? "Registro");
    const description = String(formData.get("description") ?? "").trim();
    const ownerModule = String(formData.get("module") ?? "").trim();

    if (!(file instanceof File)) {
      throw new Error("Arquivo nao enviado.");
    }

    if (!ownerTypes.has(ownerType) || !ownerId) {
      throw new Error("Modulo ou registro invalido para o anexo.");
    }

    const url = await uploadFile({
      name: file.name,
      type: file.type,
      size: file.size,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    const attachment = await createAttachmentRecord({
      ownerType: ownerType as AttachmentOwnerType,
      ownerId,
      ownerLabel,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      url,
      uploadedBy: user.name,
      description: description || null,
      module: ownerModule || ownerType,
    });
    await recordActivity({
      userName: user.name,
      action: "UPLOAD",
      module: "Anexos",
      entityId: attachment.id,
      description: `Anexo ${attachment.fileName} enviado para ${ownerLabel}.`,
      ...requestAuditMeta(request),
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
