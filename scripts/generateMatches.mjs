import { mkdirSync, writeFileSync } from "node:fs";

const groups = "ABCDEFGHIJKL".split("");
const teams = groups.flatMap((group) => [1, 2, 3, 4].map((slot) => [`${group}${slot}`, "🏳️"]));
const venues = [
  "Mexico City Stadium", "Guadalajara Stadium", "Monterrey Stadium", "Toronto Stadium",
  "Vancouver Stadium", "New York New Jersey Stadium", "Los Angeles Stadium", "Dallas Stadium",
  "Miami Stadium", "Atlanta Stadium", "Houston Stadium", "Boston Stadium", "Philadelphia Stadium",
  "Seattle Stadium", "San Francisco Bay Area Stadium", "Kansas City Stadium"
];
const matches = [];
const add = (stage, group, teamA, teamB, date, hour = 19) => {
  const a = typeof teamA === "number" ? teams[teamA] : [teamA, "🏳️"];
  const b = typeof teamB === "number" ? teams[teamB] : [teamB, "🏳️"];
  matches.push({
    id: String(matches.length + 1),
    stage,
    group,
    teamA: a[0],
    teamB: b[0],
    teamAFlagEmoji: a[1],
    teamBFlagEmoji: b[1],
    date,
    timeUTC: `${String(hour).padStart(2, "0")}:00`,
    venue: venues[matches.length % venues.length],
    status: "upcoming",
    scoreA: null,
    scoreB: null
  });
};

for (let group = 0; group < 12; group += 1) {
  const base = group * 4;
  [[0, 1], [2, 3], [0, 2], [3, 1], [3, 0], [1, 2]].forEach(([a, b], round) => {
    const day = 11 + Math.floor((group * 6 + round) / 5);
    add("دور المجموعات", `المجموعة ${groups[group]}`, base + a, base + b, `2026-06-${String(day).padStart(2, "0")}`, [16, 19, 22][round % 3]);
  });
}
for (let i = 0; i < 16; i += 1) add("دور الـ32", "", `متأهل دور الـ32 ${i * 2 + 1}`, `متأهل دور الـ32 ${i * 2 + 2}`, `2026-${i < 9 ? "06" : "07"}-${String(i < 9 ? 28 + Math.floor(i / 3) : 1 + Math.floor((i - 9) / 3)).padStart(2, "0")}`, 19 + (i % 2) * 3);
for (let i = 0; i < 8; i += 1) add("دور الـ16", "", `فائز مباراة ${73 + i * 2}`, `فائز مباراة ${74 + i * 2}`, `2026-07-${String(4 + Math.floor(i / 2)).padStart(2, "0")}`, 19 + (i % 2) * 3);
for (let i = 0; i < 4; i += 1) add("ربع النهائي", "", `فائز دور الـ16 ${i * 2 + 1}`, `فائز دور الـ16 ${i * 2 + 2}`, `2026-07-${String(9 + Math.floor(i / 2)).padStart(2, "0")}`, 19 + (i % 2) * 3);
for (let i = 0; i < 2; i += 1) add("نصف النهائي", "", `فائز ربع النهائي ${i * 2 + 1}`, `فائز ربع النهائي ${i * 2 + 2}`, `2026-07-${14 + i}`, 22);
add("تحديد المركز الثالث", "", "خاسر نصف النهائي 1", "خاسر نصف النهائي 2", "2026-07-18", 19);
add("النهائي", "", "فائز نصف النهائي 1", "فائز نصف النهائي 2", "2026-07-19", 22);
mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/matches.json", `${JSON.stringify(matches, null, 2)}\n`);
console.log(`Generated ${matches.length} matches.`);
