import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const port = 3100;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  stdio: "ignore",
  env: { ...process.env, PORT: String(port) }
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode != null) throw new Error(`Next.js server exited with code ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Next.js server did not become ready within 40 seconds.");
}

try {
  await waitForServer();
  for (const route of ["/", "/solar"]) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, `${route} should render successfully`);
    const html = await response.text();
    assert.ok(html.length > 0, `${route} should return HTML`);
  }

  const billsResponse = await fetch(`${baseUrl}/api/bills`);
  assert.equal(billsResponse.status, 200, "bill list API should respond successfully");
  const billsPayload = await billsResponse.json();
  assert.ok(Array.isArray(billsPayload.bills), "bill list API should return a bills array");

  const invalidAnalysis = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-json"
  });
  assert.equal(invalidAnalysis.status, 400, "analysis API should reject malformed JSON");

  console.log("Smoke checks passed: dashboard, solar page, bills API and analysis request validation.");
} finally {
  server.kill("SIGTERM");
}
