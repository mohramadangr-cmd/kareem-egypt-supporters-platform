import { sampleOffers, sampleRegistrationRequests } from "./mockData";

const KEYS = {
  registrations: "kareem_loyalty_registration_requests",
  offers: "kareem_loyalty_offers"
};

const hasWindow = typeof window !== "undefined";

const read = (key, fallback) => {
  if (!hasWindow) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  if (!hasWindow) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const getLoyaltyRegistrationRequests = () => read(KEYS.registrations, sampleRegistrationRequests);
export const saveLoyaltyRegistrationRequest = (request) => {
  const requests = getLoyaltyRegistrationRequests();
  write(KEYS.registrations, [request, ...requests]);
};
export const updateLoyaltyRegistrationStatus = (requestId, status) => {
  const requests = getLoyaltyRegistrationRequests().map((request) =>
    request.id === requestId ? { ...request, status, updatedAt: new Date().toISOString() } : request
  );
  write(KEYS.registrations, requests);
};

export const getLoyaltyOffers = () => read(KEYS.offers, sampleOffers);
export const saveLoyaltyOffers = (offers) => write(KEYS.offers, offers);
