import "dotenv/config";
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import { runAgent } from "./agent.js";
import { extractBillFields } from "./services/pdfBillParser.js";
import { dataDir, uploadsDir, getBills, saveBill } from "./services/billStore.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(currentDir, "../public");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    callback(isPdf ? null : new Error("Only PDF files are accepted."), isPdf);
  }
});

app.use(express.json({ limit: "100kb" }));
app.use(express.static(publicDir));

app.get("/api/bills", (_req, res) => {
  const bills = getBills().map(({ sha256, storedFile, ...bill }) => bill);
  res.json({ bills });
});

app.post("/api/bills/preview", upload.single("bill"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a PDF bill to upload." });
    if (req.file.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({ error: "The uploaded file is not a valid PDF." });
    }

    const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    if (getBills().some(bill => bill.sha256 === sha256)) {
      return res.status(409).json({ error: "This PDF has already been uploaded." });
    }

    const parsedPdf = await pdf(req.file.buffer);
    const fields = extractBillFields(parsedPdf.text || "");
    res.json({
      previewId: crypto.randomUUID(),
      originalName: path.basename(req.file.originalname),
      sha256,
      fields,
      textExtracted: Boolean(parsedPdf.text?.trim())
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/bills", upload.single("bill"), async (req, res, next) => {
  try {
    const { month, billDate = "", units, amount, consumerNumber = "", sha256: suppliedHash } = req.body;
    if (!req.file) return res.status(400).json({ error: "Upload the PDF again before saving." });
    if (req.file.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({ error: "The uploaded file is not a valid PDF." });
    }

    const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    if (suppliedHash && suppliedHash !== sha256) {
      return res.status(400).json({ error: "The uploaded file changed. Please preview it again." });
    }
    if (getBills().some(bill => bill.sha256 === sha256)) {
      return res.status(409).json({ error: "This PDF has already been uploaded." });
    }

    const parsedUnits = Number(units);
    const parsedAmount = Number(amount);
    if (!month?.trim() || !Number.isFinite(parsedUnits) || parsedUnits <= 0 ||
        !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: "Enter a billing month, positive units consumed, and a valid bill amount." });
    }

    fs.mkdirSync(uploadsDir, { recursive: true });
    const id = crypto.randomUUID();
    const storedFile = `${id}.pdf`;
    fs.writeFileSync(path.join(uploadsDir, storedFile), req.file.buffer, { flag: "wx" });

    const bill = {
      id,
      month: month.trim(),
      billDate: billDate.trim(),
      units: parsedUnits,
      amount: parsedAmount,
      consumerNumber: consumerNumber.trim(),
      originalName: path.basename(req.file.originalname),
      storedFile,
      sha256,
      uploadedAt: new Date().toISOString()
    };

    try {
      saveBill(bill);
    } catch (error) {
      fs.rmSync(path.join(uploadsDir, storedFile), { force: true });
      throw error;
    }

    const { sha256: _hash, storedFile: _file, ...publicBill } = bill;
    res.status(201).json({ bill: publicBill });
  } catch (error) {
    next(error);
  }
});

app.post("/api/analyze", async (req, res, next) => {
  try {
    const goal = typeof req.body.goal === "string" && req.body.goal.trim()
      ? req.body.goal.trim()
      : "Analyse my uploaded electricity bills. Summarise monthly consumption and cost trends.";
    const bills = getBills();
    if (!bills.length) return res.status(400).json({ error: "Upload at least one bill before running an analysis." });
    const report = await runAgent(goal);
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  res.status(status).json({ error: status === 500 ? "The request could not be completed. Check the server logs." : error.message });
});

app.listen(port, () => {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Wattwise is running at http://localhost:${port}`);
});
