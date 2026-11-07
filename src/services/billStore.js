import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = path.resolve(currentDir, "../../data");
export const uploadsDir = path.join(dataDir, "uploads");
const billsFile = path.join(dataDir, "bills.json");

function ensureStorage() {
  fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(billsFile)) {
    fs.writeFileSync(billsFile, "[]\n", "utf8");
  }
}

export function getBills() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(billsFile, "utf8"));
}

export function saveBill(bill) {
  ensureStorage();
  const bills = getBills();
  const duplicate = bills.find(item => item.sha256 === bill.sha256);
  if (duplicate) {
    const error = new Error("This PDF has already been uploaded.");
    error.status = 409;
    throw error;
  }

  const nextBills = [...bills, bill].sort((a, b) =>
    (a.billDate || a.month).localeCompare(b.billDate || b.month)
  );
  const temporaryFile = `${billsFile}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(nextBills, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryFile, billsFile);
  return bill;
}

export function findBillById(id) {
  return getBills().find(bill => bill.id === id);
}
