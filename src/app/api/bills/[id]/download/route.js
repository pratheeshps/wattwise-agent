import { NextResponse } from "next/server";
import { getRequiredSession } from "../../../../../lib/requireSession.js";
import { findBillForUser } from "../../../../../services/postgresBillStore.js";
import { readBillObject, createBillDownloadUrl, getBillStorageProvider } from "../../../../../services/objectStorage.js";

export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const { user } = await getRequiredSession();
    const { id } = await context.params;
    if (!id || id.length > 100) {
      return NextResponse.json({ error: "Invalid bill ID." }, { status: 400 });
    }

    const bill = await findBillForUser(user.id, id);
    if (!bill) {
      return NextResponse.json({ error: "Bill not found." }, { status: 404 });
    }

    if (getBillStorageProvider() === "s3") {
      const url = await createBillDownloadUrl(bill.objectKey, 60);
      return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
    }

    const file = await readBillObject(bill.objectKey);
    const filename = String(bill.originalName || "electricity-bill.pdf")
      .replace(/[\r\n"]/g, "_")
      .replace(/[^\x20-\x7E]/g, "_");
    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(file.length),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    if (error.status === 401) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    console.error("Bill download failed", error);
    return NextResponse.json({ error: "Could not download bill." }, { status: 500 });
  }
}
