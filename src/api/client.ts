import {NativeModules} from "react-native";

type HttpError = {
  status: number;
  body: any;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const FORCE_LOCALHOST_BACKEND = false;
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
  is_reservation?: boolean;
  offer?: { id: number; title: string; price: string; standardPrice?: string | null } | null;
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

export type WalletRefund = {
  id: number;
  wallet_id?: number;
  user_id?: number;
  type: string;
  status: string;
  amount: string;
  note?: string | null;
  created_at?: string;
  processed_at?: string | null;
};

export async function getMyRefunds(userId: number, token: string, walletId?: number) {
  const qs = walletId ? `?wallet_id=${walletId}` : "";
  return request<WalletRefund[]>(`/api/me/refunds${qs}`, {
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
  standardPrice?: string | null;
  mealType?: string | null;
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

export type MerchantReservationItem = {
  id: number;
  userId: number | null;
  businessId: number | null;
  createdAt: string;
  partySize: number | null;
  depositStatus: string | null;
  depositAmount: string | null;
  user: { id: number; fullName: string } | null;
  offer: {
    id: number;
    title: string;
    price: string;
    mealType: string | null;
    startTime: string;
    endTime: string;
  } | null;
};

export async function getMerchantReservations(businessId: number) {
  return request<{ count: number; items: MerchantReservationItem[] }>(
    `/api/reservations/merchant?businessId=${businessId}`
  );
}

export async function payPrepareReservation(payload: { reservationId: number; merchantId: number }) {
  return request<{
    transactionId: number;
    reservationId: number;
    merchantId: number;
    userId: number | null;
    partySize?: number;
    unitPrice?: string;
    standardPrice?: string | null;
    gross: string;
    discount: string;
    discountPct: number;
    net: string;
    status: string;
  }>("/api/pay/prepare-reservation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type MerchantDemandWindow = {
  label: string;
  start: string;
  end: string;
  demandPercent: number;
};

export type MerchantDemand = {
  businessId: number;
  activityType: string;
  activeUsers: number;
  mealPlanCounts: { FULL_BOARD: number; HALF_BOARD: number; BREAKFAST: number; NONE: number };
  windows: MerchantDemandWindow[];
  updatedAt: string;
};

export async function getMerchantDemand(businessId: number) {
  return request<MerchantDemand>(`/api/merchants/${businessId}/demand`);
}

export async function updateMerchantDemandWindows(
  businessId: number,
  payload: {
    activityType?: string;
    window1?: { label?: string; start?: string; end?: string };
    window2?: { label?: string; start?: string; end?: string };
    window3?: { label?: string; start?: string; end?: string };
  }
) {
  return request<{ ok: true; business: any }>(`/api/merchants/${businessId}/demand-windows`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateMerchantPlan(
  businessId: number,
  plan: 'BASIC' | 'RECOMMENDED' | 'OFFERS'
) {
  return request<{ ok: true; businessId: number; plan: string }>(`/api/merchants/${businessId}/plan`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
}

export async function createFlashOffer(payload: {
  merchantId: number;
  title: string;
  description?: string | null;
  price: number;
  standardPrice: number;
  mealType?: string | null;
  city?: string | null;
  startsAt: string;
  endsAt: string;
  quantityAvailable?: number | null;
}) {
  return request<FlashOfferDetail>("/api/flash-offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

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
  party_size?: number | null;
};

export async function createReservation(payload: {
  userId: number;
  businessId: number;
  flashOfferId?: number | null;
  depositAmount?: number | null;
  partySize?: number | null;
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

export async function confirmReservationArrival(id: number) {
  return request<{ ok: true; status: string }>(`/api/reservations/${id}/confirm-arrival`, {
    method: "POST",
  });
}

export async function requestRefund(userId: number, token: string) {
  return request<{ refund: any }>("/api/me/refunds/request", {
    method: "POST",
    headers: {
      "X-User-Id": String(userId),
      "X-Activation-Token": token,
    },
  });
}

export async function registerPushToken(userId: number, token: string, fcmToken: string) {
  return request<{ ok: true }>("/api/me/push-tokens", {
    method: "POST",
    headers: {
      "X-User-Id": String(userId),
      "X-Activation-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: fcmToken, channel: "FCM" }),
  });
}

export async function getNotificationCounts(userId: number, token: string) {
  return request<{ offers: number; bookings: number }>("/api/me/notifications/counts", {
    method: "GET",
    headers: {
      "X-User-Id": String(userId),
      "X-Activation-Token": token,
    },
  });
}

export async function payPrepare(payload: { userId: number; merchantId: number; gross: number }) {
  return request<{
    transactionId: number;
    merchantId: number;
    userId: number;
    gross: string;
    discount: string;
    discountPct: number;
    net: string;
    merchantPlan: string;
    merchantFeePct: number;
    merchantFeeAmount: string;
    merchantNet: string;
    status: string;
  }>("/api/pay/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function payConfirm(payload: { userId: number; token: string; transactionId: number; walletId: number }) {
  const { userId, token, transactionId, walletId } = payload;
  return request<{ ok: true; transaction: { id: number; net_amount: string; status: string } }>("/api/pay/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(userId),
      "X-Activation-Token": token,
    },
    body: JSON.stringify({ transactionId, walletId }),
  });
}
