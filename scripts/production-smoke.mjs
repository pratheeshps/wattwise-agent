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
    await fetch(baseUrl + "/api/bills", { method: "POST" }),
    400,
    "bill save API should reject a missing upload"
  );
  await expectJsonError(
    await fetch(baseUrl + "/api/bills/preview", { method: "POST" }),
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

  console.log("Smoke checks passed: dashboard and solar rendering, responsive metadata, active navigation, bill list privacy, bill upload/preview validation, missing-bill deletion and analysis request validation.");
} finally {
  server.kill("SIGTERM");
}
