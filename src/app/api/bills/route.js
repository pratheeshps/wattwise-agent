import { NextResponse } from "next/server";
import { getBills, saveBill } from "../../../services/billStore";
import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { uploadsDir } from "../../../services/billStore";
import { billSortTimestamp } from "../../../lib/billDates";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bills = getBills()
      .map(({ sha256, storedFile, consumerNumber, originalName, ...bill }) => bill)
      .sort((a, b) => billSortTimestamp(b) - billSortTimestamp(a));
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("GET /api/bills:", error);
    return NextResponse.json({ error: "Could not load saved bills." }, { status: 500 });
  }
}

export async function POST(request) {
  let storedPath;
  try {
    const form = await request.formData();
    const file = form.get("bill");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Upload the PDF again before saving." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF files must be 10 MB or smaller." }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ error: "The uploaded file is not a valid PDF." }, { status: 400 });
    }
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const existing = getBills();
    if (existing.some(bill => bill.sha256 === sha256)) {
      return NextResponse.json({ error: "This PDF has already been uploaded." }, { status: 409 });
    }

    const month = String(form.get("month") || "").trim();
    const units = Number(form.get("units"));
    const amount = Number(form.get("amount"));
    if (!month || !Number.isFinite(units) || units < 0 || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Enter a billing month, valid non-negative imported units, and a valid bill amount." }, { status: 400 });
    }
    const optionalNumber = key => {
      const value = form.get(key);
      if (value == null || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : null;
    };

    fs.mkdirSync(uploadsDir, { recursive: true });
    const id = randomUUID();
    const storedFile = id + ".pdf";
    storedPath = path.join(uploadsDir, storedFile);
    fs.writeFileSync(storedPath, buffer, { flag: "wx" });
    const bill = {
      id,
      billType: form.get("billType") === "net-metered" ? "net-metered" : "standard",
      month,
      billDate: String(form.get("billDate") || "").trim(),
      units,
      importedUnits: optionalNumber("importedUnits") ?? units,
      exportedUnits: optionalNumber("exportedUnits"),
      billedConsumption: optionalNumber("billedConsumption"),
      bankOpening: optionalNumber("bankOpening"),
      bankClosing: optionalNumber("bankClosing"),
      amount,
      netPayable: optionalNumber("netPayable"),
      consumerNumber: String(form.get("consumerNumber") || "").trim(),
      originalName: path.basename(file.name || "electricity-bill.pdf"),
      storedFile,
      sha256,
      uploadedAt: new Date().toISOString()
    };
    try {
      saveBill(bill);
    } catch (error) {
      fs.rmSync(storedPath, { force: true });
      if (error.status === 409) return NextResponse.json({ error: error.message }, { status: 409 });
      throw error;
    }
    const { sha256: _hash, storedFile: _file, consumerNumber: _consumerNumber, originalName: _originalName, ...publicBill } = bill;
    return NextResponse.json({ bill: publicBill }, { status: 201 });
  } catch (error) {
    if (storedPath) fs.rmSync(storedPath, { force: true });
    console.error("POST /api/bills:", error);
    return NextResponse.json({ error: "Could not save this bill. Check the server logs." }, { status: 500 });
  }
}
