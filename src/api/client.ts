import {NativeModules} from "react-native";

type HttpError = {
  status: number;
  body: any;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEV_HOST = "192.168.1.29";

function getMetroHost(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  // es: http://192.168.1.10:8081/index.bundle?platform=android&dev=true
  const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
  return match ? match[1] : null;
}

function getBaseUrl() {
  const envBase = process.env.POPAY_API_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const metroHost = getMetroHost();
  if (metroHost) {
    if (metroHost === "localhost" || metroHost === "127.0.0.1") {
      return `http://${DEV_HOST}:3000`;
    }
    return `http://${metroHost}:3000`;
  }
  return DEFAULT_BASE_URL;
}

async function parseBody(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  console.log("[api] baseUrl:", baseUrl);
  const res = await fetch(url, init);
  const body = await parseBody(res);

  if (!res.ok) {
    const err: HttpError = { status: res.status, body };
    throw err;
  }
  return body as T;
}

export async function activate(userId: number, hostId: number) {
  return request<{ ok: true; token: string; validFrom: string; validTo: string }>("/api/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, hostId }),
  });
}

export async function getMyWallet(userId: number, token: string) {
  return request<{ wallet: any }>("/api/wallets/me", {
    method: "GET",
    headers: {
      "X-User-Id": String(userId),
      "X-Activation-Token": token,
    },
  });
}

export async function getHealth() {
  return request<{ status: string; timestamp: string }>("/api/health", {
    method: "GET",
  });
}
