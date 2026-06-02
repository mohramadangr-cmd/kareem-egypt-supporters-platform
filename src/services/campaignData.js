import { supabase, isSupabaseConfigured } from "./supabaseClient.js";
import {
  getPredictions,
  getProfile,
  getSpins,
  savePrediction,
  saveProfile,
  saveSpin
} from "./storage.js";

export const normalizeWhatsapp = (value = "") => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.startsWith("1")) return `20${digits}`;
  return digits;
};

const logError = (scope, error) => console.error(`[Supabase:${scope}]`, error);
const fallbackPharmacyName = "صيدلية مشاركة";
const toLocalProfile = (profile) => ({
  pharmacyName: profile.pharmacyName || "",
  contactName: profile.contactName || "",
  whatsapp: normalizeWhatsapp(profile.whatsapp),
  governorate: profile.governorate || "",
  customerCode: profile.customerCode || "",
  isCurrentCustomer: profile.isCurrentCustomer || "",
  onlineOrderingInterest: profile.onlineOrderingInterest || "",
  currentOrderingMethod: profile.currentOrderingMethod || "",
  wantsContact: profile.wantsContact || "",
  favoriteTeams: profile.favoriteTeams || ""
});

const toPharmacyRow = (profile) => ({
  pharmacy_name: profile.pharmacyName?.trim() || fallbackPharmacyName,
  contact_name: profile.contactName?.trim() || null,
  whatsapp: normalizeWhatsapp(profile.whatsapp),
  governorate: profile.governorate || null,
  customer_code: profile.customerCode?.trim() || null,
  is_current_customer: profile.isCurrentCustomer || null,
  online_ordering_interest: profile.onlineOrderingInterest || null,
  preferred_ordering_method: profile.currentOrderingMethod || null,
  wants_contact: profile.wantsContact ? profile.wantsContact === "نعم" : null,
  favorite_teams: profile.favoriteTeams?.trim() || null
});

export const trackLeadEvent = async (eventType, eventData = {}, pharmacyId = null) => {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from("leads_events").insert({
    pharmacy_id: pharmacyId,
    event_type: eventType,
    event_data: eventData
  });
  if (error) logError(`leads_events:${eventType}`, error);
};

export const upsertPharmacy = async (profile, { track = true } = {}) => {
  const localProfile = toLocalProfile({ ...getProfile(), ...profile });
  saveProfile(localProfile);
  if (!isSupabaseConfigured || !localProfile.whatsapp) return { pharmacy: null, created: false, synced: false };

  const { data: existing, error: lookupError } = await supabase
    .from("pharmacies")
    .select("id")
    .eq("whatsapp", localProfile.whatsapp)
    .maybeSingle();
  if (lookupError) logError("pharmacies:lookup", lookupError);

  const { data, error } = await supabase
    .from("pharmacies")
    .upsert(toPharmacyRow(localProfile), { onConflict: "whatsapp" })
    .select()
    .single();
  if (error) {
    logError("pharmacies:upsert", error);
    return { pharmacy: null, created: false, synced: false };
  }
  const created = !existing;
  if (track) await trackLeadEvent(created ? "profile_created" : "profile_updated", { whatsapp: localProfile.whatsapp }, data.id);
  return { pharmacy: data, created, synced: true };
};

export const submitPrediction = async ({ profile, match, scoreA, scoreB, key }) => {
  const now = new Date().toISOString();
  const existingLocal = getPredictions().find((row) => row.key === key);
  const localPrediction = {
    ...profile,
    key,
    matchId: match.id,
    prediction: `${scoreA}-${scoreB}`,
    scoreA,
    scoreB,
    createdAt: existingLocal?.createdAt || now,
    updatedAt: now
  };
  savePrediction(localPrediction);
  const { pharmacy, synced: pharmacySynced } = await upsertPharmacy(profile);
  if (!isSupabaseConfigured || !pharmacySynced) return { updated: Boolean(existingLocal), synced: false };

  const { data: existing, error: lookupError } = await supabase
    .from("predictions")
    .select("id")
    .eq("pharmacy_id", pharmacy.id)
    .eq("match_id", match.id)
    .maybeSingle();
  if (lookupError) logError("predictions:lookup", lookupError);

  const payload = {
    pharmacy_id: pharmacy.id,
    match_id: match.id,
    team_a: match.teamA,
    team_b: match.teamB,
    score_a: Number(scoreA),
    score_b: Number(scoreB)
  };
  const query = existing
    ? supabase.from("predictions").update(payload).eq("id", existing.id)
    : supabase.from("predictions").insert(payload);
  const { error } = await query;
  if (error) {
    logError(existing ? "predictions:update" : "predictions:insert", error);
    return { updated: Boolean(existing || existingLocal), synced: false };
  }
  await trackLeadEvent(existing ? "prediction_updated" : "prediction_created", { match_id: match.id }, pharmacy.id);
  return { updated: Boolean(existing), synced: true };
};

export const spinWheel = async ({ whatsapp, date, prize, profile = {} }) => {
  const normalized = normalizeWhatsapp(whatsapp);
  const localExisting = getSpins().find((row) => normalizeWhatsapp(row.whatsapp) === normalized && row.date === date);
  if (!isSupabaseConfigured) {
    if (localExisting) return { prize: localExisting.prize, repeated: true, synced: false };
    saveSpin({ whatsapp: normalized, date, prize, createdAt: new Date().toISOString() });
    return { prize, repeated: false, synced: false };
  }

  const { pharmacy, synced } = await upsertPharmacy({ ...profile, whatsapp: normalized }, { track: false });
  if (!synced) {
    if (localExisting) return { prize: localExisting.prize, repeated: true, synced: false };
    saveSpin({ whatsapp: normalized, date, prize, createdAt: new Date().toISOString() });
    return { prize, repeated: false, synced: false };
  }
  const { data: existing, error: lookupError } = await supabase
    .from("wheel_spins")
    .select("prize")
    .eq("pharmacy_id", pharmacy.id)
    .eq("spin_date", date)
    .maybeSingle();
  if (lookupError) logError("wheel_spins:lookup", lookupError);
  if (existing) return { prize: existing.prize, repeated: true, synced: true };

  const { error } = await supabase.from("wheel_spins").insert({ pharmacy_id: pharmacy.id, spin_date: date, prize });
  if (error) {
    logError("wheel_spins:insert", error);
    const { data: savedSpin, error: refetchError } = await supabase
      .from("wheel_spins")
      .select("prize")
      .eq("pharmacy_id", pharmacy.id)
      .eq("spin_date", date)
      .maybeSingle();
    if (refetchError) logError("wheel_spins:refetch", refetchError);
    if (savedSpin) return { prize: savedSpin.prize, repeated: true, synced: true };
    if (localExisting) return { prize: localExisting.prize, repeated: true, synced: false };
    saveSpin({ whatsapp: normalized, date, prize, createdAt: new Date().toISOString() });
    return { prize, repeated: false, synced: false };
  }
  saveSpin({ whatsapp: normalized, date, prize, createdAt: new Date().toISOString() });
  await trackLeadEvent("wheel_spin", { prize, spin_date: date }, pharmacy.id);
  return { prize, repeated: false, synced: true };
};

export const loadLeaderboard = async () => {
  if (!isSupabaseConfigured) return null;
  const [{ data: pharmacies, error: pharmacyError }, { data: predictions, error: predictionError }] = await Promise.all([
    supabase.from("pharmacies").select("id,pharmacy_name,governorate"),
    supabase.from("predictions").select("pharmacy_id")
  ]);
  if (pharmacyError || predictionError) {
    logError("leaderboard", pharmacyError || predictionError);
    return null;
  }
  const totals = predictions.reduce((rows, prediction) => {
    rows[prediction.pharmacy_id] = (rows[prediction.pharmacy_id] || 0) + 1;
    return rows;
  }, {});
  return pharmacies
    .map((pharmacy) => ({ name: pharmacy.pharmacy_name, governorate: pharmacy.governorate || "غير محددة", points: totals[pharmacy.id] || 0 }))
    .sort((a, b) => b.points - a.points);
};

export const loadAdminTables = async () => {
  if (!isSupabaseConfigured) return null;
  const names = ["pharmacies", "predictions", "wheel_spins", "leads_events"];
  const entries = await Promise.all(names.map(async (name) => {
    const { data, error } = await supabase.from(name).select("*").limit(500);
    if (error) logError(`admin:${name}`, error);
    return [name, error ? [] : data];
  }));
  return Object.fromEntries(entries);
};
