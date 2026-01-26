import {NativeModules} from "react-native";

type HttpError = {
  status: number;
  body: any;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const FORCE_LOCALHOST_BACKEND = true;
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
  if (FORCE_LOCALHOST_BACKEND) return "http://127.0.0.1:3000";
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

export async function activateByCode(accessCode: string) {
  return request<{ ok: true; token: string; validFrom: string; validTo: string; userId: number; hostId: number }>(
    "/api/activate-by-code",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode }),
    }
  );
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

export type WalletTx = {
  id: number;
  when: string;
  description: string | null;
  net_spent: string;
  gross_amount?: number | null;
  net_amount?: number | null;
  savings?: number | null;
  merchant: { id: number; name: string; category: string | null } | null;
};

export async function getMyTransactions(userId: number, token: string, limit = 10) {
  return request<{ count: number; items: WalletTx[] }>(`/api/me/transactions?limit=${limit}`, {
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

export type FlashOfferListItem = {
  id: number;
  merchantId: number;
  title: string;
  description: string | null;
  price: string;
  startsAt: string;
  endsAt: string;
  quantityAvailable: number | null;
  quantityReserved: number | null;
  createdAt: string;
};

export type FlashOfferDetail = FlashOfferListItem & {
  merchant: {
    id: number;
    name: string;
    category: string | null;
    city: string | null;
  } | null;
};

export async function listFlashOffersNearby(city: string) {
  const q = encodeURIComponent(city);
  return request<{ city: string; count: number; items: FlashOfferListItem[] }>(
    `/api/flash-offers/nearby?city=${q}`
  );
}

export async function getFlashOfferDetail(id: number) {
  return request<FlashOfferDetail>(`/api/flash-offers/${id}`);
}

export type Reservation = {
  id: number;
  user_id?: number | null;
  business_id?: number | null;
  flash_offer_id?: number | null;
  status?: string | null;
  deposit_status?: string | null;
  outcome?: string | null;
  reserved_at?: string | null;
  guarantee_amount?: number | null;
};

export async function createReservation(payload: {
  userId: number;
  businessId: number;
  flashOfferId?: number | null;
  depositAmount?: number | null;
}) {
  return request<Reservation>("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getReservation(id: number) {
  return request<{ ok: true; reservation: Reservation }>(`/api/reservations/${id}`);
}

export async function updateReservation(
  id: number,
  payload: { status?: string; depositStatus?: string; outcome?: string }
) {
  return request<{ ok: true; reservation: Reservation }>(`/api/reservations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function holdDeposit(payload: {
  reservationId: number;
  walletId: number;
  amount: number;
  currency: string;
}) {
  return request<{ ok: true }>(`/api/reservation-deposit/hold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function releaseDeposit(payload: { reservationId: number }) {
  return request<{ ok: true }>(`/api/reservation-deposit/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function forfeitDeposit(payload: { reservationId: number; reason?: string }) {
  return request<{ ok: true }>(`/api/reservation-deposit/forfeit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function cancelReservation(id: number) {
  return request<{ ok: true; reservationId: number; policy: string; cutoffMinutes: number }>(
    `/api/reservations/${id}/cancel`,
    {
      method: "POST",
    }
  );
}
