import { execFileSync } from "node:child_process";

const RSC_ONLY_ADVISORY = "GHSA-qwww-vcr4-c8h2";

function readAuditReport() {
  const executable = process.env.npm_execpath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
  const args = process.env.npm_execpath
    ? [process.env.npm_execpath, "audit", "--omit=dev", "--json"]
    : ["audit", "--omit=dev", "--json"];

  try {
    return JSON.parse(execFileSync(executable, args, { encoding: "utf8" }));
  } catch (error) {
    const output = typeof error.stdout === "string" ? error.stdout : error.stdout?.toString("utf8");
    if (!output) throw error;
    return JSON.parse(output);
  }
}

function advisoryIds(vulnerability) {
  return (vulnerability.via ?? [])
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => item.url?.split("/").at(-1))
    .filter(Boolean);
}

const report = readAuditReport();
const vulnerabilities = Object.values(report.vulnerabilities ?? {});
const blocking = vulnerabilities.filter((item) => !advisoryIds(item).every((id) => id === RSC_ONLY_ADVISORY));

if (blocking.length > 0) {
  console.error("Production dependency audit failed.");
  for (const item of blocking) {
    console.error(`- ${item.name} (${item.severity}): ${advisoryIds(item).join(", ") || "unidentified advisory"}`);
  }
  process.exitCode = 1;
} else if (vulnerabilities.length > 0) {
  console.log(
    "Production dependency audit passed with one documented exception: GHSA-qwww-vcr4-c8h2 affects React Server Components action handling; this client-only BrowserRouter SPA does not ship RSC, SSR, actions, or server functions.",
  );
} else {
  console.log("Production dependency audit passed with no reported production vulnerabilities.");
}
