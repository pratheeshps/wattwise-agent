import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { getBills } from "../../../../services/billStore";
import { extractBillFields } from "../../../../services/pdfBillParser";

export const runtime = "nodejs";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("bill");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Choose a PDF bill to upload." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF files must be 10 MB or smaller." }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ error: "The uploaded file is not a valid PDF." }, { status: 400 });
    }
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    if (getBills().some(bill => bill.sha256 === sha256)) {
      return NextResponse.json({ error: "This PDF has already been uploaded." }, { status: 409 });
    }
    const parsed = await pdf(buffer);
    const fields = extractBillFields(parsed.text || "");
    return NextResponse.json({
      previewId: randomUUID(),
      originalName: path.basename(file.name || "electricity-bill.pdf"),
      sha256,
      fields,
      textExtracted: Boolean(parsed.text?.trim())
    });
  } catch (error) {
    console.error("POST /api/bills/preview:", error);
    return NextResponse.json({ error: "Could not read this PDF. Try another file or enter the bill details manually." }, { status: 400 });
  }
}
