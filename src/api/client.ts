type HttpError = {
  status: number;
  body: any;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

function getBaseUrl() {
  const base = process.env.POPAY_API_BASE_URL || DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
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
  const url = `${getBaseUrl()}${path}`;
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
