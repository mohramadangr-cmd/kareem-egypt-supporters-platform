import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { getAppOrdersProgress, getDrawEntries, getPointsLedger, getPredictions, getProfile, saveAppOrdersProgress, saveDrawEntry, savePointsEntry } from "./storage.js";

const logError = (scope, error) => console.error(`[Points:${scope}]`, error);
const localId = (pharmacyId) => pharmacyId || "local-pharmacy";
const normalizeWhatsapp = (value = "") => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.startsWith("1")) return `20${digits}`;
  return digits;
};
const localTotal = (pharmacyId) => getPointsLedger()
  .filter((entry) => entry.pharmacyId === localId(pharmacyId))
  .reduce((total, entry) => total + Number(entry.points || 0), 0);

const getLocalLeaderboard = () => {
  const totals = getPointsLedger().reduce((rows, entry) => {
    rows[entry.pharmacyId] = (rows[entry.pharmacyId] || 0) + Number(entry.points || 0);
    return rows;
  }, {});
  const profile = getProfile();
  const profileId = profile?.whatsapp ? `local:${normalizeWhatsapp(profile.whatsapp)}` : null;
  const rows = Object.entries(totals).map(([id, points]) => ({
    id,
    name: id === profileId ? profile?.pharmacyName || "صيدلية مشاركة" : "صيدلية مشاركة",
    governorate: id === profileId ? profile?.governorate || "غير محددة" : "غير محددة",
    points
  }));
  return rows.sort((a, b) => b.points - a.points);
};

const award = async (pharmacyId, activityType, points, sourceId, notes = "") => {
  const id = localId(pharmacyId);
  const localDuplicate = getPointsLedger().some((entry) => entry.pharmacyId === id && entry.activityType === activityType && entry.sourceId === sourceId);
  if (localDuplicate && (!isSupabaseConfigured || !pharmacyId)) return { awarded: false, points: 0, total: await getPharmacyTotalPoints(pharmacyId) };

  if (isSupabaseConfigured && pharmacyId) {
    const { data: existing, error: lookupError } = await supabase
      .from("points_ledger")
      .select("id")
      .eq("pharmacy_id", pharmacyId)
      .eq("activity_type", activityType)
      .eq("source_id", sourceId)
      .maybeSingle();
    if (lookupError) logError(`${activityType}:lookup`, lookupError);
    if (existing) return { awarded: false, points: 0, total: await getPharmacyTotalPoints(pharmacyId) };
    const { error } = await supabase.from("points_ledger").insert({
      pharmacy_id: pharmacyId,
      activity_type: activityType,
      points,
      source_id: sourceId,
      notes
    });
    if (error) logError(`${activityType}:insert`, error);
  }

  if (!localDuplicate) savePointsEntry({ pharmacyId: id, activityType, points, sourceId, notes, createdAt: new Date().toISOString() });
  return { awarded: !localDuplicate, points: localDuplicate ? 0 : points, total: await getPharmacyTotalPoints(pharmacyId) };
};

export const awardRegistrationBonus = (pharmacyId) => award(pharmacyId, "registration_bonus", 100, "registration", "Registration bonus");
export const awardPredictionSubmitPoints = (pharmacyId, matchId) => award(pharmacyId, "prediction_submit", 10, `match:${matchId}`, "Prediction submitted");
export const awardWheelParticipationPoints = (pharmacyId, spinId) => award(pharmacyId, "wheel_daily_participation", 5, `spin:${spinId}`, "Daily wheel participation");
export const awardContactRequestPoints = (pharmacyId) => award(pharmacyId, "contact_request", 25, "contact-request", "Requested Kareem Pharma contact");
export const awardAppInterestPoints = (pharmacyId) => award(pharmacyId, "app_interest", 100, "app-interest", "Clicked Kareem Pharma app CTA");
export const awardPredictionResultPoints = async (pharmacyId, prediction, result) => {
  const predictedA = Number(prediction.score_a ?? prediction.scoreA); const predictedB = Number(prediction.score_b ?? prediction.scoreB);
  const actualA = Number(result.scoreA); const actualB = Number(result.scoreB); const source = `match:${result.id}`;
  if (predictedA === actualA && predictedB === actualB) return award(pharmacyId, "correct_score", 50, source, "Correct score");
  const predictedDifference = predictedA - predictedB; const actualDifference = actualA - actualB;
  if (predictedDifference === 0 && actualDifference === 0) return award(pharmacyId, "correct_draw", 20, source, "Correct draw");
  if (Math.sign(predictedDifference) === Math.sign(actualDifference)) {
    if (predictedDifference === actualDifference) return award(pharmacyId, "correct_goal_difference", 15, source, "Correct goal difference");
    return award(pharmacyId, "correct_winner", 20, source, "Correct winner");
  }
  return { awarded: false, points: 0, total: await getPharmacyTotalPoints(pharmacyId) };
};

export const scoreMatchPredictions = async (result) => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("predictions").select("pharmacy_id,score_a,score_b").eq("match_id", result.id);
    if (!error) return Promise.all(data.map((prediction) => awardPredictionResultPoints(prediction.pharmacy_id, prediction, result)));
    logError("score-match", error);
  }
  return Promise.all(getPredictions().filter((prediction) => prediction.matchId === result.id).map((prediction) => awardPredictionResultPoints(`local:${normalizeWhatsapp(prediction.whatsapp)}`, prediction, result)));
};

const wheelPrizePoints = { "+10 نقطة": 10, "+30 نقطة": 30, "+50 نقطة": 50, "+100 نقطة": 100 };
export const awardWheelPrizePoints = (pharmacyId, prize, spinId) => {
  const points = wheelPrizePoints[prize] || 0;
  return points ? award(pharmacyId, "wheel_prize", points, `spin-prize:${spinId}`, prize) : Promise.resolve({ awarded: false, points: 0, total: localTotal(pharmacyId) });
};

export const getPharmacyTotalPoints = async (pharmacyId) => {
  if (isSupabaseConfigured && pharmacyId) {
    const { data, error } = await supabase.from("points_ledger").select("points").eq("pharmacy_id", pharmacyId);
    if (!error) return data.reduce((total, entry) => total + Number(entry.points || 0), 0);
    logError("total", error);
  }
  return localTotal(pharmacyId);
};

export const getPharmacyDashboard = async (profile) => {
  const whatsapp = profile?.whatsapp;
  let pharmacyId = null;
  if (isSupabaseConfigured && whatsapp) {
    const { data, error } = await supabase.from("pharmacies").select("id").eq("whatsapp", whatsapp).maybeSingle();
    if (!error) pharmacyId = data?.id || null;
    else logError("dashboard:pharmacy", error);
  }
  if (!pharmacyId) pharmacyId = whatsapp ? `local:${whatsapp}` : "local-pharmacy";
  const localProgress = getAppOrdersProgress().find((row) => row.pharmacyId === pharmacyId) || { orderCount: 0, qualifiedForGrandDraw: false };
  if (!isSupabaseConfigured || pharmacyId.startsWith("local:")) {
    const points = await getPharmacyTotalPoints(pharmacyId);
    const rank = getLocalLeaderboard().findIndex((row) => row.id === pharmacyId) + 1;
    return { pharmacyId, points, rank: rank || null, orderCount: localProgress.orderCount, qualifiedForGrandDraw: localProgress.qualifiedForGrandDraw };
  }
  const { data, error } = await supabase.from("app_orders_progress").select("order_count,qualified_for_grand_draw").eq("pharmacy_id", pharmacyId).maybeSingle();
  if (error) logError("dashboard:orders", error);
  const [points, leaderboard] = await Promise.all([getPharmacyTotalPoints(pharmacyId), getLeaderboard()]);
  const rank = leaderboard?.findIndex((row) => row.id === pharmacyId) + 1;
  return { pharmacyId, points, rank: rank || null, orderCount: data?.order_count || 0, qualifiedForGrandDraw: data?.qualified_for_grand_draw || false };
};

export const getLeaderboard = async () => {
  if (!isSupabaseConfigured) return getLocalLeaderboard();
  const [{ data: pharmacies, error: pharmacyError }, { data: ledger, error: ledgerError }] = await Promise.all([
    supabase.from("pharmacies").select("id,pharmacy_name,governorate"),
    supabase.from("points_ledger").select("pharmacy_id,points")
  ]);
  if (pharmacyError || ledgerError) {
    logError("leaderboard", pharmacyError || ledgerError);
    return null;
  }
  const totals = ledger.reduce((rows, entry) => ({ ...rows, [entry.pharmacy_id]: (rows[entry.pharmacy_id] || 0) + Number(entry.points || 0) }), {});
  return pharmacies.map((pharmacy) => ({ id: pharmacy.id, name: pharmacy.pharmacy_name, governorate: pharmacy.governorate || "غير محددة", points: totals[pharmacy.id] || 0 })).sort((a, b) => b.points - a.points);
};

export const addGrandDrawEntry = async (pharmacyId, source = "manual_admin") => {
  const localDuplicate = getDrawEntries().some((entry) => entry.pharmacyId === pharmacyId && entry.drawType === "app_10_orders_draw");
  if (!localDuplicate) saveDrawEntry({
    id: `local:draw:${Date.now()}`,
    pharmacyId,
    drawType: "app_10_orders_draw",
    source,
    createdAt: new Date().toISOString()
  });
  if (isSupabaseConfigured) {
    const { data: existing, error: lookupError } = await supabase
      .from("draw_entries")
      .select("id")
      .eq("pharmacy_id", pharmacyId)
      .eq("draw_type", "app_10_orders_draw")
      .maybeSingle();
    if (lookupError) logError("draw-entry:lookup", lookupError);
    if (!existing) {
      const { error } = await supabase.from("draw_entries").insert({ pharmacy_id: pharmacyId, draw_type: "app_10_orders_draw", source });
      if (error) logError("draw-entry:insert", error);
    }
  }
};

export const markGrandDrawQualified = async (pharmacyId) => {
  const current = getAppOrdersProgress().find((row) => row.pharmacyId === pharmacyId) || { orderCount: 0 };
  const progress = { pharmacyId, orderCount: Number(current.orderCount || 0), qualifiedForGrandDraw: true, lastUpdatedAt: new Date().toISOString() };
  saveAppOrdersProgress(progress);
  if (isSupabaseConfigured) {
    const { data } = await supabase.from("app_orders_progress").select("order_count").eq("pharmacy_id", pharmacyId).maybeSingle();
    const orderCount = data?.order_count ?? progress.orderCount;
    const { error } = await supabase.from("app_orders_progress").upsert({
      pharmacy_id: pharmacyId,
      order_count: orderCount,
      qualified_for_grand_draw: true,
      last_updated_at: progress.lastUpdatedAt
    }, { onConflict: "pharmacy_id" });
    if (error) logError("orders:qualify", error);
  }
  await addGrandDrawEntry(pharmacyId);
  return progress;
};

export const updateAppOrdersProgress = async (pharmacyId, orderCount) => {
  let previousCount = getAppOrdersProgress().find((row) => row.pharmacyId === pharmacyId)?.orderCount || 0;
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("app_orders_progress").select("order_count").eq("pharmacy_id", pharmacyId).maybeSingle();
    if (!error) previousCount = data?.order_count || previousCount;
    else logError("orders:lookup", error);
  }
  const progress = { pharmacyId, orderCount: Number(orderCount), qualifiedForGrandDraw: Number(orderCount) >= 10, lastUpdatedAt: new Date().toISOString() };
  saveAppOrdersProgress(progress);
  if (isSupabaseConfigured) {
    const { error } = await supabase.from("app_orders_progress").upsert({
      pharmacy_id: pharmacyId,
      order_count: progress.orderCount,
      qualified_for_grand_draw: progress.qualifiedForGrandDraw,
      last_updated_at: progress.lastUpdatedAt
    }, { onConflict: "pharmacy_id" });
    if (error) logError("orders:update", error);
  }
  if (progress.orderCount > 0) await award(pharmacyId, "first_app_order", 200, "first-order", "First Kareem Pharma app order");
  for (let order = previousCount + 1; order <= progress.orderCount; order += 1) await award(pharmacyId, "app_order", 50, `order:${order}`, "Kareem Pharma app order");
  if (progress.orderCount >= 10) {
    await award(pharmacyId, "ten_app_orders_bonus", 1000, "ten-orders", "Qualified for grand draw");
    await addGrandDrawEntry(pharmacyId, "app_orders_progress");
  }
  return progress;
};

export const addManualPoints = (pharmacyId, points, reason) => award(pharmacyId, "manual_adjustment", Number(points), `manual:${Date.now()}`, reason);
