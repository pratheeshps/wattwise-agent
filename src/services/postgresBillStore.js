import { prisma } from "../lib/prisma.js";

const toBillRecord = bill => ({
  ...bill,
  uploadedAt: bill.uploadedAt instanceof Date ? bill.uploadedAt.toISOString() : bill.uploadedAt
});

export async function getBillsForUser(userId) {
  if (!userId) throw new Error("A user ID is required to read bills.");
  const bills = await prisma.bill.findMany({
    where: { userId },
    orderBy: [{ uploadedAt: "desc" }, { id: "asc" }]
  });
  return bills.map(toBillRecord);
}

export async function saveBillForUser(userId, bill) {
  if (!userId) throw new Error("A user ID is required to save bills.");
  try {
    const saved = await prisma.bill.create({
      data: {
        id: bill.id,
        userId,
        billType: bill.billType,
        month: bill.month,
        billDate: bill.billDate || "",
        units: bill.units,
        importedUnits: bill.importedUnits ?? null,
        exportedUnits: bill.exportedUnits ?? null,
        billedConsumption: bill.billedConsumption ?? null,
        bankOpening: bill.bankOpening ?? null,
        bankClosing: bill.bankClosing ?? null,
        amount: bill.amount,
        netPayable: bill.netPayable ?? null,
        consumerNumber: bill.consumerNumber || null,
        originalName: bill.originalName || null,
        objectKey: bill.objectKey,
        sha256: bill.sha256,
        uploadedAt: bill.uploadedAt ? new Date(bill.uploadedAt) : new Date()
      }
    });
    return toBillRecord(saved);
  } catch (error) {
    if (error.code === "P2002") {
      const duplicate = new Error("This PDF has already been uploaded.");
      duplicate.status = 409;
      throw duplicate;
    }
    throw error;
  }
}

export async function deleteBillForUser(userId, id) {
  if (!userId || !id) throw new Error("A user ID and bill ID are required.");
  const result = await prisma.bill.deleteMany({ where: { id, userId } });
  return result.count === 1;
}
