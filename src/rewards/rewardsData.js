import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

export const WHATSAPP_NUMBER = "01145000445";
export const WHATSAPP_DEFAULT_MESSAGE = "السلام عليكم، أرغب في الاستفادة من عروض برنامج كريم فارما للمكافآت.";
export const SELECTED_PHARMACY_STORAGE_KEY = "kareem_rewards_selected_pharmacy";

export const GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "السويس",
  "القليوبية",
  "الغربية",
  "الدقهلية",
  "البحيرة",
  "كفر الشيخ",
  "الشرقية",
  "المنوفية",
  "دمياط",
  "الإسماعيلية",
  "بورسعيد",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "مطروح",
  "الوادي الجديد",
  "شمال سيناء",
  "جنوب سيناء"
];

export const CONTACT_BRANCHES = [
  "الإدارة العامة: الدقي",
  "كرداسة: الجيزة",
  "عين شمس: القاهرة",
  "وسط البلد: السيدة زينب",
  "الإسكندرية",
  "السويس"
];

export const DEFAULT_LEVELS = [
  { id: "bronze", levelName: "برونزي", minPoints: 0, maxPoints: 999, benefits: "" },
  { id: "silver", levelName: "فضي", minPoints: 1000, maxPoints: 2999, benefits: "" },
  { id: "gold", levelName: "ذهبي", minPoints: 3000, maxPoints: 6999, benefits: "" },
  { id: "platinum", levelName: "بلاتيني", minPoints: 7000, maxPoints: Infinity, benefits: "" }
];

const ADMIN_TABLES = [
  "registration_requests",
  "pharmacies",
  "points_ledger",
  "offers",
  "loyalty_levels",
  "point_uploads",
  "point_redemptions"
];

const hasWindow = typeof window !== "undefined";

const toNumericString = (value = "") => value.replace(/\D/g, "");

export const normalizeWhatsapp = (value = "") => {
  const digits = toNumericString(value);
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.startsWith("1")) return `20${digits}`;
  return digits;
};

export const formatWhatsappCandidates = (value = "") => {
  const normalized = normalizeWhatsapp(value);
  const local = normalized.startsWith("20") ? `0${normalized.slice(2)}` : normalized;
  return Array.from(new Set([normalized, local, toNumericString(value)].filter(Boolean)));
};

const logError = (scope, error) => console.error(`[Rewards:${scope}]`, error);

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseGiftValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getWhatsappUrl = (message = WHATSAPP_DEFAULT_MESSAGE) =>
  `https://wa.me/2${WHATSAPP_NUMBER}?text=${encodeURIComponent(message || WHATSAPP_DEFAULT_MESSAGE)}`;

export const saveSelectedPharmacy = (pharmacy) => {
  if (!hasWindow || !pharmacy) return;
  window.localStorage.setItem(SELECTED_PHARMACY_STORAGE_KEY, JSON.stringify(pharmacy));
};

export const readSelectedPharmacy = () => {
  if (!hasWindow) return null;
  try {
    const raw = window.localStorage.getItem(SELECTED_PHARMACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSelectedPharmacy = () => {
  if (!hasWindow) return;
  window.localStorage.removeItem(SELECTED_PHARMACY_STORAGE_KEY);
};

export const mapLevelRow = (row) => ({
  id: row.id,
  levelName: row.level_name ?? row.levelName ?? "",
  minPoints: parseNumber(row.min_points ?? row.minPoints),
  maxPoints: row.max_points === null || row.max_points === undefined ? Infinity : parseNumber(row.max_points, Infinity),
  benefits: row.benefits ?? ""
});

export const mapPharmacyRow = (row) => ({
  id: row.id,
  pharmacyName: row.pharmacy_name ?? row.pharmacyName ?? "",
  contactName: row.contact_name ?? row.contactName ?? "",
  whatsapp: row.whatsapp ?? "",
  governorate: row.governorate ?? "",
  customerCode: row.customer_code ?? row.customerCode ?? ""
});

export const mapOfferRow = (row) => ({
  id: row.id,
  title: row.title ?? "",
  shortDescription: row.short_description ?? "",
  bannerUrl: row.banner_url ?? "",
  offerType: row.offer_type ?? "",
  rewardText: row.reward_text ?? "",
  pointsReward: parseNumber(row.points_reward),
  giftValue: row.gift_value,
  startDate: row.start_date ?? null,
  endDate: row.end_date ?? null,
  terms: row.terms ?? "",
  isActive: row.is_active !== false,
  whatsappMessage: row.whatsapp_message ?? "",
  sortOrder: parseNumber(row.sort_order),
  createdAt: row.created_at ?? null,
  updatedAt: row.updated_at ?? null
});

export const mapLedgerRow = (row) => ({
  id: row.id,
  pharmacyId: row.pharmacy_id ?? null,
  customerCode: row.customer_code ?? "",
  pointsType: row.points_type ?? row.activity_type ?? "admin",
  description: row.description ?? row.notes ?? "",
  points: parseNumber(row.points),
  referenceId: row.reference_id ?? row.source_id ?? "",
  source: row.source ?? "",
  transactionDate: row.transaction_date ?? row.created_at ?? null,
  createdAt: row.created_at ?? null,
  createdBy: row.created_by ?? ""
});

export const mapRedemptionRow = (row) => ({
  id: row.id,
  pharmacyId: row.pharmacy_id ?? null,
  customerCode: row.customer_code ?? "",
  pointsUsed: parseNumber(row.points_used),
  rewardType: row.reward_type ?? "",
  rewardDescription: row.reward_description ?? "",
  status: row.status ?? "",
  createdAt: row.created_at ?? null,
  approvedAt: row.approved_at ?? null
});

export const getCurrentLevel = (points, levels) =>
  levels.find((level) => points >= level.minPoints && points <= level.maxPoints) || levels[0] || DEFAULT_LEVELS[0];

export const getNextLevelGap = (points, levels) => {
  const nextLevel = levels.find((level) => points < level.minPoints);
  return nextLevel ? nextLevel.minPoints - points : 0;
};

const POINT_GROUPS = {
  welcome: ["welcome", "registration", "activation"],
  onlineOrders: ["online_orders", "online_order", "orders", "order"],
  offers: ["offers", "offer"],
  campaigns: ["campaigns", "campaign"],
  admin: ["admin"],
  redemption: ["redemption", "redeemed"]
};

const inGroup = (pointsType, aliases) => aliases.includes((pointsType || "").toLowerCase());

export const summarizeLedger = (ledger, levels = DEFAULT_LEVELS) => {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const availablePoints = ledger.reduce((sum, item) => sum + parseNumber(item.points), 0);
  const monthlyPoints = ledger
    .filter((item) => parseNumber(item.points) > 0 && String(item.transactionDate || "").slice(0, 7) === monthKey)
    .reduce((sum, item) => sum + parseNumber(item.points), 0);
  const categories = {
    welcome: ledger
      .filter((item) => inGroup(item.pointsType, POINT_GROUPS.welcome))
      .reduce((sum, item) => sum + Math.max(parseNumber(item.points), 0), 0),
    onlineOrders: ledger
      .filter((item) => inGroup(item.pointsType, POINT_GROUPS.onlineOrders))
      .reduce((sum, item) => sum + Math.max(parseNumber(item.points), 0), 0),
    offers: ledger
      .filter((item) => inGroup(item.pointsType, POINT_GROUPS.offers))
      .reduce((sum, item) => sum + Math.max(parseNumber(item.points), 0), 0),
    campaigns: ledger
      .filter((item) => inGroup(item.pointsType, POINT_GROUPS.campaigns))
      .reduce((sum, item) => sum + Math.max(parseNumber(item.points), 0), 0),
    admin: ledger
      .filter((item) => inGroup(item.pointsType, POINT_GROUPS.admin))
      .reduce((sum, item) => sum + Math.max(parseNumber(item.points), 0), 0),
    redemption: ledger
      .filter((item) => inGroup(item.pointsType, POINT_GROUPS.redemption))
      .reduce((sum, item) => sum + Math.abs(Math.min(parseNumber(item.points), 0)), 0)
  };
  const currentLevel = getCurrentLevel(availablePoints, levels);
  const nextLevelGap = getNextLevelGap(availablePoints, levels);

  return {
    availablePoints,
    monthlyPoints,
    categories,
    currentLevel,
    nextLevelGap,
    lastMovement: ledger[0] || null
  };
};

export const fetchLoyaltyLevels = async () => {
  if (!isSupabaseConfigured) return DEFAULT_LEVELS;
  const { data, error } = await supabase.from("loyalty_levels").select("*").order("sort_order", { ascending: true });
  if (error) {
    logError("loyalty-levels", error);
    return DEFAULT_LEVELS;
  }
  return data?.length ? data.map(mapLevelRow) : DEFAULT_LEVELS;
};

export const submitRegistrationRequest = async (form) => {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const payload = {
    pharmacy_name: form.pharmacyName.trim(),
    contact_name: form.contactName.trim(),
    whatsapp: normalizeWhatsapp(form.whatsapp),
    email: form.email.trim(),
    governorate: form.governorate,
    address: form.address.trim(),
    request_type: form.requestType,
    customer_code: form.customerCode.trim() || null
  };
  const { data, error } = await supabase.from("registration_requests").insert(payload).select("id").single();
  if (error) {
    logError("registration-request", error);
    throw error;
  }
  return data;
};

export const fetchActiveOffers = async () => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    logError("offers", error);
    return [];
  }
  const today = new Date().toISOString().slice(0, 10);
  return (data || [])
    .map(mapOfferRow)
    .filter((offer) => (!offer.startDate || offer.startDate <= today) && (!offer.endDate || offer.endDate >= today));
};

export const lookupPharmacy = async ({ customerCode, whatsapp }) => {
  if (!isSupabaseConfigured) return null;
  const cleanCode = customerCode.trim();
  const whatsappCandidates = formatWhatsappCandidates(whatsapp);
  const { data, error } = await supabase
    .from("pharmacies")
    .select("id,pharmacy_name,contact_name,whatsapp,governorate,customer_code")
    .eq("customer_code", cleanCode);
  if (error) {
    logError("lookup-pharmacy", error);
    throw error;
  }
  const match = (data || []).map(mapPharmacyRow).find((row) => whatsappCandidates.includes(toNumericString(row.whatsapp)));
  if (match) saveSelectedPharmacy(match);
  return match || null;
};

export const fetchLedgerForPharmacy = async ({ pharmacyId, customerCode }) => {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from("points_ledger").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (pharmacyId) query = query.eq("pharmacy_id", pharmacyId);
  else if (customerCode) query = query.eq("customer_code", customerCode);
  else return [];
  const { data, error } = await query;
  if (error) {
    logError("points-ledger", error);
    return [];
  }
  return (data || []).map(mapLedgerRow);
};

export const fetchRedemptionsForPharmacy = async ({ pharmacyId, customerCode }) => {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from("point_redemptions").select("*").order("created_at", { ascending: false });
  if (pharmacyId) query = query.eq("pharmacy_id", pharmacyId);
  else if (customerCode) query = query.eq("customer_code", customerCode);
  else return [];
  const { data, error } = await query;
  if (error) {
    logError("point-redemptions", error);
    return [];
  }
  return (data || []).map(mapRedemptionRow);
};

export const hydrateSelectedPharmacy = async () => {
  const stored = readSelectedPharmacy();
  if (!stored || !isSupabaseConfigured) return stored;
  try {
    const match = await lookupPharmacy({ customerCode: stored.customerCode || "", whatsapp: stored.whatsapp || "" });
    return match || stored;
  } catch {
    return stored;
  }
};

export const fetchAdminDataset = async () => {
  if (!isSupabaseConfigured) return null;
  const results = await Promise.all(
    ADMIN_TABLES.map(async (name) => {
      let query = supabase.from(name).select("*").limit(500);
      if (name === "offers") query = query.order("sort_order", { ascending: true }).order("created_at", { ascending: false });
      else if (name === "loyalty_levels") query = query.order("sort_order", { ascending: true });
      else if (name === "point_uploads") query = query.order("uploaded_at", { ascending: false });
      else query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) {
        logError(`admin-${name}`, error);
        return [name, []];
      }
      return [name, data || []];
    })
  );
  return Object.fromEntries(results);
};

export const updateRegistrationRequestStatus = async (requestId, status) => {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("registration_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) {
    logError("registration-status", error);
    throw error;
  }
};

export const saveOffer = async (offer) => {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const payload = {
    title: offer.title.trim(),
    short_description: offer.shortDescription.trim(),
    banner_url: offer.bannerUrl.trim() || null,
    offer_type: offer.offerType.trim() || null,
    reward_text: offer.rewardText.trim() || null,
    points_reward: parseNumber(offer.pointsReward),
    gift_value: parseGiftValue(offer.giftValue),
    start_date: offer.startDate || null,
    end_date: offer.endDate || null,
    terms: offer.terms.trim() || null,
    is_active: offer.isActive !== false,
    whatsapp_message: offer.whatsappMessage.trim() || null,
    sort_order: parseNumber(offer.sortOrder),
    updated_at: new Date().toISOString()
  };
  const query = offer.id
    ? supabase.from("offers").update(payload).eq("id", offer.id)
    : supabase.from("offers").insert(payload);
  const { error } = await query;
  if (error) {
    logError("save-offer", error);
    throw error;
  }
};

export const toggleOfferActiveState = async (offerId, isActive) => {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const { error } = await supabase
    .from("offers")
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq("id", offerId);
  if (error) {
    logError("toggle-offer", error);
    throw error;
  }
};

export const addManualPointsRecord = async ({ pharmacyId, customerCode, pointsType, description, points, referenceId, source, createdBy }) => {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("points_ledger").insert({
    pharmacy_id: pharmacyId || null,
    customer_code: customerCode?.trim() || null,
    points_type: pointsType,
    description: description.trim(),
    points: parseNumber(points),
    reference_id: referenceId?.trim() || null,
    source: source?.trim() || "admin",
    transaction_date: new Date().toISOString().slice(0, 10),
    created_by: createdBy?.trim() || "admin"
  });
  if (error) {
    logError("manual-points", error);
    throw error;
  }
};

export const exportRowsToCsv = (rows, filename) => {
  if (!hasWindow || !rows?.length) return;
  const fields = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );
  const csv = [fields, ...rows.map((row) => fields.map((field) => `"${String(row?.[field] ?? "").replaceAll("\"", "\"\"")}"`))]
    .map((line) => line.join(","))
    .join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
