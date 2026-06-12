#!/usr/bin/env node

const targetUrl = process.argv[2] || process.env.SMOKE_URL;

if (!targetUrl) {
  console.error("Uso: npm run smoke:vercel -- https://tu-deployment.vercel.app");
  process.exit(1);
}

const baseUrl = new URL(targetUrl);
const checks = [
  {
    name: "home responde 200",
    url: new URL("/", baseUrl),
    options: { method: "GET" },
    expectedStatus: 200
  },
  {
    name: "API IA requiere token",
    url: new URL("/api/ai/crear", baseUrl),
    options: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    },
    expectedStatus: 401
  }
];

let failed = false;

for (const check of checks) {
  try {
    const response = await fetch(check.url, {
      ...check.options,
      signal: AbortSignal.timeout(15000)
    });

    if (response.status !== check.expectedStatus) {
      failed = true;
      console.error(`FAIL ${check.name}: esperado ${check.expectedStatus}, recibido ${response.status}`);
      continue;
    }

    console.log(`OK ${check.name}: ${response.status}`);
  } catch (error) {
    failed = true;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL ${check.name}: ${message}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Smoke OK: ${baseUrl.origin}`);
