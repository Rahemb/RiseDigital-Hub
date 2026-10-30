import { resolve4 } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";
import { normalizeWebsite } from "../../lib/leads";
export function isPublicIPv4(ip: string) {
  if (isIP(ip) !== 4) return false;
  const [a, b, c] = ip.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113) ||
    ip === "168.63.129.16"
  );
}
export function publicUrl(raw: string) {
  const u = new URL(normalizeWebsite(raw));
  const host = u.hostname.toLowerCase();
  if (
    !host.includes(".") ||
    host.endsWith(".") ||
    /\.(localhost|local|internal|lan|home|test|invalid|example)$/.test(host) ||
    host === "localhost" ||
    host.includes(":") ||
    (isIP(host) && !isPublicIPv4(host))
  )
    throw new Error("Internal, private and reserved addresses are blocked");
  return u;
}
export async function resolvePublic(
  host: string,
  resolver: (host: string) => Promise<string[]> = resolve4,
) {
  const addresses = isIP(host) ? [host] : await resolver(host);
  if (!addresses.length || addresses.some((ip) => !isPublicIPv4(ip)))
    throw new Error("DNS resolves to a private or reserved address");
  return addresses[0];
}
export type WebResult = {
  url: string;
  status: number;
  type: string;
  body: string;
};
async function oneRequest(
  url: URL,
  maxBytes: number,
  expires: number,
): Promise<WebResult & { location?: string }> {
  if (Date.now() >= expires) throw new Error("Website check timed out");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("DNS lookup timed out")),
      Math.min(5000, expires - Date.now()),
    );
  });
  let ip: string;
  try {
    ip = await Promise.race([resolvePublic(url.hostname), timeout]);
  } finally {
    clearTimeout(timer);
  }
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).request(
      url,
      {
        method: "GET",
        family: 4,
        agent: false,
        lookup: (_host, _options, callback) => callback(null, ip, 4),
        headers: {
          "User-Agent":
            "RiseDigitalHubAudit/1.0 (+https://risedigital.no; kontakt@risedigital.no)",
          Accept: "text/html,text/plain;q=0.8",
          "Accept-Encoding": "identity",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          response.destroy();
          clearTimeout(deadline);
          resolve({
            url: url.href,
            status,
            type: "",
            body: "",
            location: response.headers.location,
          });
          return;
        }
        if (
          response.headers["content-encoding"] &&
          response.headers["content-encoding"] !== "identity"
        ) {
          request.destroy(
            new Error(
              "Compressed responses are not supported by this basic audit",
            ),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            request.destroy(new Error("Website exceeds the size limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          clearTimeout(deadline);
          resolve({
            url: url.href,
            status,
            type: String(response.headers["content-type"] ?? ""),
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        response.on("error", reject);
      },
    );
    const deadline = setTimeout(
      () =>
        request.destroy(new Error("Website did not respond within 10 seconds")),
      Math.max(1, Math.min(10000, expires - Date.now())),
    );
    request.on("error", (e) => {
      clearTimeout(deadline);
      reject(e);
    });
    request.end();
  });
}
export function robotsAllowed(text: string, path: string) {
  let agents: string[] = [];
  let rulesStarted = false;
  for (const line of text.split(/\r?\n/)) {
    const clean = line.split("#")[0].trim();
    const i = clean.indexOf(":");
    if (i < 0) continue;
    const name = clean.slice(0, i).trim().toLowerCase(),
      value = clean.slice(i + 1).trim();
    if (name === "user-agent") {
      if (rulesStarted) {
        agents = [];
        rulesStarted = false;
      }
      agents.push(value.toLowerCase());
      continue;
    }
    rulesStarted = true;
    if (!agents.some((a) => a === "*" || "risedigitalhubaudit".includes(a)))
      continue;
    if (name === "crawl-delay" && Number(value) > 1) return false;
    if (name === "disallow" && value) {
      const pattern = value
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replaceAll("*", ".*")
        .replace(/\\\$$/, "$");
      try {
        if (new RegExp("^" + pattern).test(path)) return false;
      } catch {
        return false;
      }
    }
  }
  return true;
}
export async function fetchPublic(
  raw: string,
  respectRobots = true,
  maxBytes = 1000000,
  expires = Date.now() + 90000,
  transport: typeof oneRequest = oneRequest,
): Promise<WebResult> {
  let url = publicUrl(raw);
  const visited = new Set<string>();
  for (let hop = 0; hop <= 3; hop++) {
    if (visited.has(url.href)) throw new Error("Redirect loop");
    visited.add(url.href);
    if (respectRobots) {
      const robots = await fetchPublic(
        new URL("/robots.txt", url).href,
        false,
        100000,
        expires,
        transport,
      );
      if (
        robots.status !== 404 &&
        (robots.status !== 200 ||
          !robotsAllowed(robots.body, url.pathname + url.search))
      )
        throw new Error(
          "Automated analysis is not allowed or robots.txt could not be verified",
        );
      await new Promise((r) => setTimeout(r, 1000));
    }
    const result = await transport(url, maxBytes, expires);
    if (result.status >= 300 && result.status < 400) {
      if (!result.location) throw new Error("Invalid redirect");
      url = publicUrl(new URL(result.location, url).href);
      continue;
    }
    if ([401, 403, 429].includes(result.status))
      throw new Error(
        `Access restricted (HTTP ${result.status}). Review manually.`,
      );
    return result;
  }
  throw new Error("Too many redirects");
}
