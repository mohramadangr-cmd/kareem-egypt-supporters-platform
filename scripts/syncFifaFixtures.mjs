import { writeFileSync } from "node:fs";

const FIFA_FIXTURES_URL = "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023";
const OUTPUT = "src/data/fixtures.json";
const unresolved = "لم يتحدد بعد";

const teams = {
  MEX: "المكسيك", RSA: "جنوب أفريقيا", KOR: "كوريا الجنوبية", CZE: "التشيك", CAN: "كندا",
  BIH: "البوسنة والهرسك", USA: "الولايات المتحدة", PAR: "باراجواي", BRA: "البرازيل",
  MAR: "المغرب", SCO: "اسكتلندا", HAI: "هايتي", AUS: "أستراليا", TUR: "تركيا",
  ARG: "الأرجنتين", ALG: "الجزائر", AUT: "النمسا", JOR: "الأردن", ECU: "الإكوادور",
  CIV: "ساحل العاج", CUW: "كوراساو", GER: "ألمانيا", NED: "هولندا", JPN: "اليابان",
  TUN: "تونس", BEL: "بلجيكا", EGY: "مصر", IRN: "إيران", NZL: "نيوزيلندا",
  CPV: "الرأس الأخضر", KSA: "السعودية", URU: "أوروجواي", ESP: "إسبانيا", FRA: "فرنسا",
  SEN: "السنغال", NOR: "النرويج", POR: "البرتغال", COL: "كولومبيا", CRO: "كرواتيا",
  GHA: "غانا", PAN: "بنما", UZB: "أوزبكستان", ENG: "إنجلترا", QAT: "قطر",
  COD: "الكونغو الديمقراطية", IRQ: "العراق", SWE: "السويد"
};
const stages = {
  "First Stage": "دور المجموعات", "Round of 32": "دور الـ32", "Round of 16": "دور الـ16",
  "Quarter-final": "ربع النهائي", "Semi-final": "نصف النهائي", "Play-off for third place": "تحديد المركز الثالث",
  Final: "النهائي"
};
const groupLetters = { A: "أ", B: "ب", C: "ج", D: "د", E: "هـ", F: "و", G: "ز", H: "ح", I: "ط", J: "ي", K: "ك", L: "ل" };
const venues = {
  "Mexico City Stadium": "استاد مدينة مكسيكو", "Guadalajara Stadium": "استاد جوادالاخارا", "Monterrey Stadium": "استاد مونتيري",
  "Toronto Stadium": "استاد تورونتو", "Vancouver Stadium": "استاد فانكوفر", "New York New Jersey Stadium": "استاد نيويورك نيوجيرسي",
  "Los Angeles Stadium": "استاد لوس أنجلوس", "Dallas Stadium": "استاد دالاس", "Miami Stadium": "استاد ميامي",
  "Atlanta Stadium": "استاد أتلانتا", "Houston Stadium": "استاد هيوستن", "Boston Stadium": "استاد بوسطن",
  "Philadelphia Stadium": "استاد فيلادلفيا", "Seattle Stadium": "استاد سياتل", "San Francisco Bay Area Stadium": "استاد سان فرانسيسكو",
  "Kansas City Stadium": "استاد كانساس سيتي", "BC Place Vancouver": "استاد بي سي بليس فانكوفر", "New York/New Jersey Stadium": "استاد نيويورك نيوجيرسي",
  "San Francisco Bay Area Stadium": "استاد سان فرانسيسكو", "New York New Jersey Stadium": "استاد نيويورك نيوجيرسي"
};

const localized = (value) => value?.[0]?.Description || "";
const flag = (team) => team?.PictureUrl?.replace("{format}", "sq").replace("{size}", "4") || "";
const status = (value) => value === 3 ? "finished" : value === 2 ? "live" : "upcoming";
const teamName = (team) => team ? teams[team.IdCountry] || localized(team.TeamName) || team.ShortClubName : unresolved;
const groupName = (value) => {
  const letter = localized(value).replace("Group ", "");
  return letter ? `المجموعة ${groupLetters[letter] || letter}` : "";
};

const response = await fetch(FIFA_FIXTURES_URL, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`FIFA fixtures request failed: ${response.status}`);
const payload = await response.json();
if (!Array.isArray(payload.Results) || payload.Results.length !== 104) throw new Error(`Expected 104 FIFA fixtures, received ${payload.Results?.length ?? 0}`);

const fixtures = payload.Results
  .map((match) => ({
    id: String(match.MatchNumber),
    fifaMatchId: match.IdMatch,
    stage: stages[localized(match.StageName)] || localized(match.StageName),
    group: groupName(match.GroupName),
    teamA: teamName(match.Home),
    teamB: teamName(match.Away),
    teamAFlag: flag(match.Home),
    teamBFlag: flag(match.Away),
    date: match.Date.slice(0, 10),
    timeUTC: match.Date.slice(11, 16),
    venue: venues[localized(match.Stadium?.Name)] || localized(match.Stadium?.Name),
    city: localized(match.Stadium?.CityName),
    status: status(match.MatchStatus),
    scoreA: match.Home?.Score ?? match.HomeTeamScore,
    scoreB: match.Away?.Score ?? match.AwayTeamScore,
    source: "FIFA"
  }))
  .sort((a, b) => Number(a.id) - Number(b.id));

writeFileSync(OUTPUT, `${JSON.stringify(fixtures, null, 2)}\n`);
console.log(`Synced ${fixtures.length} official FIFA World Cup 2026 fixtures to ${OUTPUT}.`);
