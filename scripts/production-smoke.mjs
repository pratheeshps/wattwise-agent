import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const port = 3100;
const baseUrl = "http://127.0.0.1:" + port;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  stdio: "ignore",
  env: { ...process.env, PORT: String(port) }
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode != null) throw new Error("Next.js server exited with code " + server.exitCode);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Next.js server did not become ready within 40 seconds.");
}

async function expectJsonError(response, status, label) {
  assert.equal(response.status, status, label);
  const payload = await response.json();
  assert.equal(typeof payload.error, "string", label + ": error message should be present");
  return payload;
}

try {
  await waitForServer();

  for (const [route, heading] of [["/", "Your electricity"], ["/solar", "Your solar energy"]]) {
    const response = await fetch(baseUrl + route);
    assert.equal(response.status, 200, route + " should render successfully");
    const html = await response.text();
    assert.ok(html.length > 0, route + " should return HTML");
    assert.ok(html.includes(heading), route + " should render its expected page heading");
    assert.ok(html.includes('name="viewport"'), route + " should include responsive viewport metadata");
  }

  const dashboard = await fetch(baseUrl);
  const dashboardHtml = await dashboard.text();
  assert.ok(dashboardHtml.includes('aria-current="page"'), "dashboard navigation should expose its active page");
  const solarPage = await fetch(baseUrl + "/solar");
  const solarHtml = await solarPage.text();
  assert.ok(solarHtml.includes("Solar analytics"), "solar navigation label should render");

  const billsResponse = await fetch(baseUrl + "/api/bills");
  assert.equal(billsResponse.status, 200, "bill list API should respond successfully");
  const billsPayload = await billsResponse.json();
  assert.ok(Array.isArray(billsPayload.bills), "bill list API should return a bills array");
  for (const bill of billsPayload.bills) {
    for (const privateField of ["sha256", "storedFile"]) {
      assert.equal(privateField in bill, false, "bill list must not expose " + privateField);
    }
  }

  await expectJsonError(
    await fetch(baseUrl + "/api/bills", { method: "POST", body: new FormData() }),
    400,
    "bill save API should reject a missing upload"
  );
  await expectJsonError(
    await fetch(baseUrl + "/api/bills/preview", { method: "POST", body: new FormData() }),
    400,
    "bill preview API should reject a missing PDF"
  );

  const invalidPdfForm = new FormData();
  invalidPdfForm.append("bill", new Blob(["not a PDF"], { type: "application/pdf" }), "invalid.pdf");
  await expectJsonError(
    await fetch(baseUrl + "/api/bills/preview", { method: "POST", body: invalidPdfForm }),
    400,
    "bill preview API should reject a non-PDF payload"
  );

  const invalidSaveForm = new FormData();
  invalidSaveForm.append("bill", new Blob(["%PDF-1.4 test"], { type: "application/pdf" }), "valid-signature.pdf");
  await expectJsonError(
    await fetch(baseUrl + "/api/bills", { method: "POST", body: invalidSaveForm }),
    400,
    "bill save API should require reviewed billing fields"
  );

  await expectJsonError(
    await fetch(baseUrl + "/api/bills/__sprint5_missing_bill__", { method: "DELETE" }),
    404,
    "bill delete API should return not found for an unknown ID"
  );

  await expectJsonError(
    await fetch(baseUrl + "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json"
    }),
    400,
    "analysis API should reject malformed JSON"
  );
  await expectJsonError(
    await fetch(baseUrl + "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: 123 })
    }),
    400,
    "analysis API should reject non-text analysis goals"
  );
  await expectJsonError(
    await fetch(baseUrl + "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedMonth: "2026-13" })
    }),
    400,
    "analysis API should reject a non-canonical billing month"
  );

  // Exercise the complete persistence/API boundary with a disposable fixture.
  // Always delete it so smoke tests never leave test bills in local storage.
  const fixturePdf = Buffer.from("%PDF-1.4\\n% Wattwise smoke fixture\\n%%EOF", "ascii");
  let fixtureId = null;
  try {
    const saveForm = new FormData();
    saveForm.append("bill", new Blob([fixturePdf], { type: "application/pdf" }), "wattwise-smoke.pdf");
    saveForm.append("billType", "standard");
    saveForm.append("month", "January 2098");
    saveForm.append("units", "0");
    saveForm.append("importedUnits", "0");
    saveForm.append("amount", "0");
    saveForm.append("netPayable", "");
    const saveResponse = await fetch(baseUrl + "/api/bills", { method: "POST", body: saveForm });
    assert.equal(saveResponse.status, 201, "a reviewed bill with genuine zero values should save");
    const savedPayload = await saveResponse.json();
    fixtureId = savedPayload.bill.id;
    assert.equal(savedPayload.bill.importedUnits, 0, "a genuine zero reading should be preserved");
    assert.equal("sha256" in savedPayload.bill, false, "save response must not expose the PDF hash");
    assert.equal("storedFile" in savedPayload.bill, false, "save response must not expose the storage path");

    const duplicateForm = new FormData();
    duplicateForm.append("bill", new Blob([fixturePdf], { type: "application/pdf" }), "wattwise-smoke-duplicate.pdf");
    duplicateForm.append("month", "January 2098");
    duplicateForm.append("units", "0");
    duplicateForm.append("amount", "0");
    await expectJsonError(
      await fetch(baseUrl + "/api/bills", { method: "POST", body: duplicateForm }),
      409,
      "bill save API should reject a duplicate PDF"
    );

    const analysisResponse = await fetch(baseUrl + "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedMonth: "2098-01" })
    });
    assert.ok([200, 502, 503].includes(analysisResponse.status), "valid month analysis should either succeed or return a recoverable provider error");
    const analysisPayload = await analysisResponse.json();
    if (analysisResponse.status === 200) {
      assert.equal(typeof analysisPayload.report, "string", "successful analysis should return a report");
      assert.equal(analysisPayload.context?.selectedPeriod?.key, "2098-01", "analysis should identify the selected month");
    } else {
      assert.equal(typeof analysisPayload.error, "string", "provider failure should return a recoverable error");
    }

    const refreshedBills = await (await fetch(baseUrl + "/api/bills")).json();
    const fixture = refreshedBills.bills.find(bill => bill.id === fixtureId);
    assert.ok(fixture, "saved fixture should appear in bill history");
    for (const privateField of ["sha256", "storedFile", "consumerNumber", "originalName"]) {
      assert.equal(privateField in fixture, false, "bill history must not expose " + privateField);
    }
  } finally {
    if (fixtureId) {
      const deleteResponse = await fetch(baseUrl + "/api/bills/" + encodeURIComponent(fixtureId), { method: "DELETE" });
      assert.equal(deleteResponse.status, 200, "smoke fixture should be deleted after acceptance checks");
    }
  }

  console.log("Smoke checks passed: dashboard and solar rendering, responsive metadata, bill privacy, upload/preview validation, duplicate protection, zero-value persistence, month-scoped analysis/provider recovery and fixture cleanup.");
} finally {
  server.kill("SIGTERM");
}
