import { NextResponse } from "next/server";
import { deleteBillById } from "../../../../../services/billStore";

export const runtime = "nodejs";

export async function DELETE(_request, context) {
  try {
    const { id } = await context.params;
    if (!id || id.length > 100) {
      return NextResponse.json({ error: "A valid bill ID is required." }, { status: 400 });
    }
    const bill = deleteBillById(id);
    if (!bill) {
      return NextResponse.json({ error: "This bill was not found. It may already have been deleted." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, billId: bill.id, month: bill.month });
  } catch (error) {
    console.error("DELETE /api/bills/[id]:", error);
    return NextResponse.json({ error: "Could not delete this bill." }, { status: 500 });
  }
}
