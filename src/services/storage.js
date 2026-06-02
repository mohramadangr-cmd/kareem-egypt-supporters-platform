const KEYS = {
  predictions: "kareem_predictions",
  spins: "kareem_wheel_spins",
  matchResults: "kareem_match_results",
  profile: "kareem_pharmacy_profile"
};

const read = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const getPredictions = () => read(KEYS.predictions);
export const savePrediction = (prediction) => {
  const rows = getPredictions();
  const index = rows.findIndex((row) => row.key === prediction.key);
  if (index >= 0) rows[index] = prediction;
  else rows.push(prediction);
  write(KEYS.predictions, rows);
};
export const getSpins = () => read(KEYS.spins);
export const saveSpin = (spin) => write(KEYS.spins, [...getSpins(), spin]);
export const getMatchResults = () => read(KEYS.matchResults);
export const getProfile = () => JSON.parse(localStorage.getItem(KEYS.profile) || "null");
export const saveProfile = (profile) => localStorage.setItem(KEYS.profile, JSON.stringify(profile));
export const saveMatchResult = (result) => {
  const rows = getMatchResults();
  const index = rows.findIndex((row) => row.id === result.id);
  if (index >= 0) rows[index] = result;
  else rows.push(result);
  write(KEYS.matchResults, rows);
};
export const clearDemoData = () => Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
