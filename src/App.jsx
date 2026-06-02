import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import matchesData from "./data/fixtures.json";
import offers from "./data/offers.json";
import branches from "./data/branches.json";
import { campaign } from "./config/campaign";
import "leaflet/dist/leaflet.css";
import {
  clearDemoData,
  getMatchResults,
  getProfile,
  getPredictions,
  getSpins,
  saveMatchResult,
  saveProfile,
  savePrediction,
  saveSpin
} from "./services/storage";

const { assetPaths } = campaign;
const governorates = ["القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "الغربية", "المنوفية", "القليوبية", "البحيرة", "الفيوم", "المنيا", "أسيوط", "سوهاج", "قنا", "أسوان", "أخرى"];
const wheelPrizes = ["تيشيرت منتخب مصر", "كاب تشجيع", "كرة صغيرة تذكارية", "ميدالية تذكارية", "نقاط إضافية", "هدية مفاجأة من كريم فارما", "حظ أوفر"];
const pharmacies = [
  ["صيدلية النور", "القاهرة", 192],
  ["صيدلية الحياة", "الجيزة", 175],
  ["صيدلية الشفاء", "الدقهلية", 158],
  ["صيدلية الأمل", "الشرقية", 142],
  ["صيدلية المدينة", "الإسكندرية", 131]
];
const desktopNav = [
  ["/", "الرئيسية"], ["/matches", "المباريات"], ["/leaderboard", "لوحة الشرف"],
  ["/wheel", "عجلة الحظ"], ["/offers", "العروض"], ["/rules", "القواعد"], ["/branches", "الفروع"]
];

const getDate = (match) => new Date(`${match.date}T${match.timeUTC}:00Z`);
const cairoDate = (match) => new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", month: "short", day: "numeric" }).format(getDate(match));
const cairoTime = (match) => new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "2-digit" }).format(getDate(match));
const todayCairo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
const shiftDate = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const isStarted = (match) => getDate(match) <= new Date();
const isEgyptMatch = (match) => match.teamA === "مصر" || match.teamB === "مصر";
const openPredictionDates = () => [...new Set(matchesData.filter((match) => !isStarted(match)).map((match) => match.date))].sort().slice(0, 3);
const canPredict = (match) => !isStarted(match) && (isEgyptMatch(match) || openPredictionDates().includes(match.date));
const getMatches = () => {
  const results = getMatchResults();
  return matchesData.map((match) => ({ ...match, ...results.find((row) => row.id === match.id) }));
};
const contactUrl = `https://wa.me/${campaign.whatsappNumber}?text=${encodeURIComponent(campaign.whatsappMessage)}`;

function App() {
  return <div className="app-shell">
    <div className="stadium-lights" />
    <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div>
    <AnnouncementBar />
    <Header />
    <main><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/matches" element={<Matches />} />
      <Route path="/matches/:id" element={<MatchDetails />} />
      <Route path="/predict/:id" element={<Prediction />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/wheel" element={<Wheel />} />
      <Route path="/offers" element={<Offers />} />
      <Route path="/results" element={<Results />} />
      <Route path="/branches" element={<Branches />} />
      <Route path="/rules" element={<Rules />} />
      <Route path="/admin-demo" element={<AdminDemo />} />
      <Route path="*" element={<NotFound />} />
    </Routes></main>
    <Footer /><Link className="floating-predict" to="/matches">توقع الآن</Link><BottomNav />
  </div>;
}

function Header() {
  const profile = getProfile();
  return <header className="site-header">
    <Link to="/" className="brand"><img src={assetPaths.logo} alt="كريم فارما" /></Link>
    <nav className="desktop-nav">{desktopNav.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
    {profile?.pharmacyName && <span className="header-greeting">أهلاً {profile.pharmacyName}</span>}
    <a className="header-cta" href={contactUrl} target="_blank" rel="noreferrer">تواصل معنا</a>
  </header>;
}
function AnnouncementBar() { return <div className="announcement"><div>{Array.from({ length: 3 }, (_, index) => <span key={index}>شجع بلدك • اربح بوكس التشجيع من كريم فارما • توقع النتيجة الآن • جرّب تطبيق كريم فارما للطلبات</span>)}</div></div>; }

function BottomNav() {
  return <nav className="bottom-nav">
    {[
      ["/", "⌂", "الرئيسية"],
      ["/#today", "⚽", "اليوم"],
      ["/matches", "★", "توقع"],
      ["/wheel", "✦", "العجلة"],
      ["/offers", "٪", "العروض"]
    ].map(([to, icon, label]) => <NavLink key={to} to={to}><b>{icon}</b><span>{label}</span></NavLink>)}
  </nav>;
}

function Footer() {
  return <footer>
    <p>كريم فارما بتشجع منتخب مصر في كأس العالم ⚽</p>
    <div className="footer-links">
      <a href={contactUrl} target="_blank" rel="noreferrer">واتساب: 01145000445</a>
      <a href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">فيسبوك كريم فارما</a>
      <Link to="/branches">فروع كريم فارما</Link>
    </div>
  </footer>;
}

function SectionTitle({ eyebrow, title, text, action, link }) {
  return <div className="section-title-row"><div className="section-title"><span>{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>{action && <Link to={link}>{action} ←</Link>}</div>;
}

function Home() {
  const matches = getMatches();
  const openMatches = matches.filter(canPredict);
  const profile = getProfile();
  return <>
    <section className="hero hero-compact wrap">
      <div className="hero-copy">
        {profile?.pharmacyName && <div className="pharmacy-greeting">أهلاً {profile.pharmacyName}</div>}
        <span className="pill">حملة كريم فارما للصيدليات</span>
        <h1><em>شجع بلدك</em></h1>
        <p>توقع النتيجة واكسب بوكس التشجيع من كريم فارما</p>
        <div className="actions"><a className="btn primary" href="#predict-now">توقع الآن</a><Link className="btn ghost" to="/wheel">لف عجلة الحظ</Link></div>
        <div className="hero-proof">{[["١٢٠٠", "صيدلية مشاركة"], ["٣٨٥٠", "توقع مسجل"], ["١٥٠", "جائزة موزعة"]].map(([value, label]) => <span key={label}><strong>{value}</strong>{label}</span>)}</div>
      </div>
      <div className="hero-visual"><img className="flag-backdrop" src={assetPaths.egyptFlag} alt="" /><img className="cheer-box hero-box" src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" /></div>
    </section>
    <section id="predict-now" className="wrap prediction-spotlight campaign-section">
      <div className="prediction-spotlight-head"><div><span>التوقعات مفتوحة الآن</span><h2>توقع الآن واكسب مع كريم فارما</h2><p>اختار الماتش وسجل توقع صيدليتك في خطوات بسيطة.</p></div><b>{openMatches.length}<small>ماتش مفتوح</small></b></div>
      <div className="home-match-grid">{openMatches.slice(0, 4).map((match) => <MatchCard match={match} key={match.id} />)}</div>
      <div className="prediction-actions"><Link className="btn primary" to="/matches">كل المباريات المفتوحة</Link><Link className="subtle-link" to="/matches">جدول البطولة كامل ←</Link></div>
    </section>
    <section className="wrap wheel-home-feature campaign-section">
      <div><span>جوائز يومية</span><h2>لف العجلة اليومية</h2><p>ادخل رقم واتساب وجرب حظك كل يوم مع كريم فارما.</p><Link className="btn primary" to="/wheel">ابدأ الآن</Link></div>
      <b>✦</b>
    </section>
    <section className="wrap prize-feature campaign-section">
      <img src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" />
      <div><span>الجائزة الكبرى</span><h2>ماذا يوجد داخل بوكس التشجيع؟</h2><p>تيشيرت منتخب مصر • كاب تشجيع • هدايا ومفاجآت • جوائز إضافية</p><Link className="btn primary" to="/matches">ادخل السحب الآن</Link></div>
    </section>
    <section className="wrap campaign-section">
      <SectionTitle eyebrow="للصيدليات" title="عروض البطولة للصيدليات" action="شوف كل العروض" link="/offers" />
      <div className="offers-grid preview-grid">{offers.slice(0, 3).map((offer) => <OfferCard offer={offer} key={offer.id} />)}</div>
    </section>
    <section className="wrap app-promo campaign-section"><div><span>طلبات الصيدليات</span><h2>اطلب مباشرة من تطبيق كريم فارما</h2><p>عروض حصرية • متابعة الطلبات • سهولة الطلب • تجربة أسرع</p><a className="btn primary" href={contactUrl} target="_blank" rel="noreferrer">اطلب رابط التطبيق</a></div><b>📱</b></section>
    <section className="wrap about-kareem campaign-section"><div><span>ثقة وخبرة من ٢٠٠٥</span><h2>من هي كريم فارما؟</h2><p>كريم فارما شركة مصرية متخصصة في توزيع الأدوية تأسست عام 2005.</p><p>تُعد واحدة من أكبر شركات توزيع الأدوية في مصر، وحاصلة على شهادة GSDP الخاصة بجودة التخزين والتوزيع الدوائي.</p><p>يرأسها د. رفاعي ربيع رئيس لجنة الموزعين بالشعبة العامة للأدوية.</p><p>هدفنا تقديم خدمة توزيع احترافية تساعد الصيدليات على النمو وتحقيق أفضل تجربة شراء.</p></div><div className="trust-badges"><b><img src={assetPaths.egyptFlag} alt="" /><small>شركة مصرية</small></b><b>✓<small>جودة GSDP</small></b><b>★<small>ثقة الصيدليات</small></b></div></section>
    <section className="wrap results-home campaign-section"><div><span>نتائج البطولة</span><h2>تابع النتائج وجدول المباريات</h2></div><div><Link className="btn primary" to="/results">شوف النتائج</Link><Link className="btn ghost" to="/matches">جدول البطولة</Link></div></section>
    <section className="wrap contact-feature campaign-section"><div><span>فريقنا معاك</span><h2>تواصل مع كريم فارما</h2><p>اسأل عن العروض والطلبات وخدمات الصيدليات.</p></div><div><a className="btn primary" href={contactUrl} target="_blank" rel="noreferrer">واتساب 01145000445</a><a className="btn ghost" href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">فيسبوك</a></div></section>
  </>;
}

function EmptyCard({ text }) { return <div className="empty-card">{text}</div>; }
function TeamFlag({ src, name }) { return src ? <img className="team-flag" src={src} alt={`علم ${name}`} /> : <b className="unknown-flag">؟</b>; }

function MatchCard({ match, noAction = false, resultOnly = false }) {
  const state = getMatchState(match);
  return <article className="match-card">
    <div className="match-meta"><span>{match.stage}{match.group && ` • ${match.group}`}</span><MatchStateBadge state={state} /></div>
    <div className="teams"><div><TeamFlag src={match.teamAFlag} name={match.teamA} /><strong>{match.teamA}</strong></div><span>{match.status === "finished" ? `${match.scoreA} - ${match.scoreB}` : "ضد"}</span><div><TeamFlag src={match.teamBFlag} name={match.teamB} /><strong>{match.teamB}</strong></div></div>
    <div className="match-bottom"><small>{cairoDate(match)} • {cairoTime(match)}</small>{!noAction && !resultOnly && (state === "open" ? <Link to={`/predict/${match.id}`}>توقع الآن</Link> : <button disabled>{state === "upcoming" ? "يفتح التوقع قريبًا" : "تم غلق التوقع"}</button>)}</div>
  </article>;
}
function getMatchState(match) { if (match.status === "finished") return "finished"; if (isStarted(match)) return "closed"; return canPredict(match) ? "open" : "upcoming"; }
function MatchStateBadge({ state }) { return <i className={`status ${state}`}>{({ open: "التوقعات مفتوحة", upcoming: "⏳ يفتح التوقع قريبًا", closed: "تم غلق التوقع", finished: "✅ انتهت المباراة" })[state]}</i>; }

function Matches() {
  const matches = getMatches();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [stage, setStage] = useState("all");
  const filtered = useMemo(() => matches.filter((match) => {
    const searched = `${match.teamA} ${match.teamB}`.includes(query.trim());
    const selected = filter === "all" || (filter === "today" && match.date === todayCairo()) || (filter === "tomorrow" && match.date === shiftDate(todayCairo(), 1)) || (filter === "upcoming" && match.status === "upcoming") || (filter === "finished" && match.status === "finished");
    return searched && selected && (stage === "all" || match.stage === stage);
  }), [matches, query, filter, stage]);
  return <section className="page wrap">
    <SectionTitle eyebrow="كأس العالم 2026" title="جدول مباريات البطولة" text="الجدول الرسمي للبطولة بتوقيت القاهرة." />
    <div className="featured-egypt"><img src={assetPaths.egyptFlag} alt="" /><div><h3>تابع مباريات منتخب مصر</h3><p>شجع منتخبنا وسجل توقع صيدليتك قبل الماتش.</p></div><span>{matches.filter((match) => match.teamA === "مصر" || match.teamB === "مصر").length} مباريات</span></div>
    <div className="filter-panel"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="دور على فريق..." /><select value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">كل الأدوار</option>{[...new Set(matches.map((match) => match.stage))].map((value) => <option key={value}>{value}</option>)}</select><div className="filter-chips">{[["all", "الكل"], ["today", "اليوم"], ["tomorrow", "بكرة"], ["upcoming", "القادمة"], ["finished", "النتائج"]].map(([value, label]) => <button className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div></div>
    <div className="matches-grid">{filtered.map((match) => <MatchCard match={match} key={match.id} />)}</div>{!filtered.length && <EmptyCard text="مفيش مباريات مطابقة للبحث." />}
  </section>;
}

function MatchDetails() {
  const { id } = useParams(); const match = getMatches().find((row) => row.id === id);
  if (!match) return <NotFound />;
  return <section className="page narrow wrap"><SectionTitle eyebrow="تفاصيل الماتش" title="تفاصيل المباراة" /><MatchCard match={match} noAction />{canPredict(match) ? <div className="center-action"><Link className="btn primary" to={`/predict/${id}`}>سجل توقعك دلوقتي</Link></div> : <div className="notice">التوقع هيفتح قريبًا. تابع المباريات المفتوحة من الصفحة الرئيسية.</div>}</section>;
}

function Prediction() {
  const { id } = useParams(); const navigate = useNavigate(); const match = getMatches().find((row) => row.id === id);
  const keyBase = (whatsapp, pharmacyName) => `${pharmacyName.trim()}_${whatsapp.replace(/\D/g, "")}_${id}`;
  const initial = { pharmacyName: "", contactName: "", whatsapp: "", governorate: "", customerCode: "", isCurrentCustomer: "", onlineOrderingInterest: "", currentOrderingMethod: "", wantsContact: "", favoriteTeams: "", scoreA: "", scoreB: "", consent: false, ...getProfile() };
  const [form, setForm] = useState(initial); const [success, setSuccess] = useState(false); const [locked, setLocked] = useState(false);
  if (!match) return <NotFound />;
  if (!canPredict(match)) return <section className="page narrow wrap"><SectionTitle eyebrow="التوقعات" title="التوقع هيفتح قريبًا" /><MatchCard match={match} noAction /><div className="notice">تابع المباريات المفتوحة من الصفحة الرئيسية.</div><Link className="btn ghost back-link" to="/matches">ارجع لجدول المباريات</Link></section>;
  const submit = (event) => { event.preventDefault(); if (locked || isStarted(match)) return setLocked(true); const now = new Date().toISOString(); const key = keyBase(form.whatsapp, form.pharmacyName); const existing = getPredictions().find((row) => row.key === key); saveProfile({ pharmacyName: form.pharmacyName, contactName: form.contactName, whatsapp: form.whatsapp, governorate: form.governorate, customerCode: form.customerCode, isCurrentCustomer: form.isCurrentCustomer, onlineOrderingInterest: form.onlineOrderingInterest, currentOrderingMethod: form.currentOrderingMethod, wantsContact: form.wantsContact, favoriteTeams: form.favoriteTeams }); savePrediction({ ...form, key, matchId: id, prediction: `${form.scoreA}-${form.scoreB}`, createdAt: existing?.createdAt || now, updatedAt: now }); setSuccess(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const findExisting = (next) => { const row = getPredictions().find((item) => item.key === keyBase(next.whatsapp, next.pharmacyName)); if (row) setForm(row); setLocked(Boolean(row && isStarted(match))); };
  if (success) return <section className="page narrow wrap"><div className="success-card"><img src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" /><h1>تم تسجيل توقعك بنجاح</h1><p>بالتوفيق في السحب على بوكس التشجيع من كريم فارما</p><button onClick={() => navigate("/wheel")} className="btn primary">لف عجلة الحظ</button></div></section>;
  return <section className="page narrow wrap"><SectionTitle eyebrow="توقع واكسب" title="إيه توقع صيدليتك؟" text="سجل بيانات الصيدلية وثبت النتيجة." /><MatchCard match={match} noAction /><form className="prediction-form" onSubmit={submit}>
    <div className="field"><label>اسم الصيدلية</label><input required value={form.pharmacyName} onChange={(e) => { const next = { ...form, pharmacyName: e.target.value }; setForm(next); findExisting(next); }} /></div>
    <div className="field"><label>اسم الصيدلي / المسؤول</label><input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
    <div className="form-row"><div className="field"><label>رقم واتساب</label><input required inputMode="tel" value={form.whatsapp} onChange={(e) => { const next = { ...form, whatsapp: e.target.value }; setForm(next); findExisting(next); }} placeholder="01xxxxxxxxx" /></div><div className="field"><label>المحافظة</label><select required value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })}><option value="">اختار المحافظة</option>{governorates.map((value) => <option key={value}>{value}</option>)}</select></div></div>
    <div className="field"><label>كود العميل إن وجد</label><input value={form.customerCode} onChange={(e) => setForm({ ...form, customerCode: e.target.value })} /></div>
    <RadioField label="هل أنت عميل حالي لكريم فارما؟" name="customer" options={campaign.customerOptions} value={form.isCurrentCustomer} onChange={(value) => setForm({ ...form, isCurrentCustomer: value })} />
    <RadioField label="هل مهتم بالشراء أونلاين من كريم فارما؟" name="online" options={campaign.onlineOrderOptions} value={form.onlineOrderingInterest} onChange={(value) => setForm({ ...form, onlineOrderingInterest: value })} />
    <RadioField label="هل تستخدم حاليًا؟" name="ordering-method" options={campaign.orderingMethodOptions} value={form.currentOrderingMethod} onChange={(value) => setForm({ ...form, currentOrderingMethod: value })} />
    <RadioField label="هل ترغب أن يتواصل معك فريق كريم فارما؟" name="wants-contact" options={["نعم", "لا"]} required={false} value={form.wantsContact} onChange={(value) => setForm({ ...form, wantsContact: value })} />
    <div className="field"><label>الفرق اللي بتشجعها</label><input value={form.favoriteTeams} onChange={(e) => setForm({ ...form, favoriteTeams: e.target.value })} placeholder="مثال: مصر والمغرب" /></div>
    <div className="score-box"><h3>توقع النتيجة</h3><div><label><span>{match.teamA}</span><input required type="number" min="0" max="20" value={form.scoreA} onChange={(e) => setForm({ ...form, scoreA: e.target.value })} /></label><em>-</em><label><span>{match.teamB}</span><input required type="number" min="0" max="20" value={form.scoreB} onChange={(e) => setForm({ ...form, scoreB: e.target.value })} /></label></div></div>
    <label className="consent"><input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /> أوافق على استقبال تنبيهات المباريات والعروض من كريم فارما</label><button className="btn primary submit" disabled={locked}>ثبت توقع صيدليتك</button>
  </form></section>;
}
function RadioField({ label, name, options, value, onChange, required = true }) { return <div className="field"><label>{label}</label><div className="radio-grid">{options.map((option) => <label key={option}><input required={required} type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />{option}</label>)}</div></div>; }

function Results() { const finished = getMatches().filter((match) => match.status === "finished"); return <section className="page wrap"><SectionTitle eyebrow="النتائج" title="نتائج المباريات" text="كل النتائج بتوقيت القاهرة." />{finished.length ? <div className="matches-grid">{finished.map((match) => <MatchCard match={match} noAction resultOnly key={match.id} />)}</div> : <EmptyCard text="النتائج هتظهر هنا مع بداية البطولة." />}</section>; }

function Leaderboard() {
  const governorateRanks = [["القاهرة", 448], ["الدقهلية", 382], ["الشرقية", 341]];
  return <section className="page wrap">
    <SectionTitle eyebrow="أبطال التشجيع" title="لوحة شرف الصيدليات" text="كل توقع صحيح يقرب صيدليتك من الصدارة." />
    <div className="leader-highlight"><b>🏆</b><div><span>المنافسة مستمرة</span><h3>خلي صيدليتك في أول القائمة</h3><p>شارك توقعاتك واجمع نقاط أكتر مع كل ماتش.</p></div></div>
    <div className="leader-grid">
      <article className="leader-card"><h3>أفضل الصيدليات</h3>{pharmacies.map(([name, governorate, points], index) => <div className={`rank-row ${index < 3 ? "top-rank" : ""}`} key={name}><b className="rank-medal">{["🥇", "🥈", "🥉"][index] || index + 1}</b><div><strong>{name}</strong><small>{governorate}</small></div><em>{points} نقطة</em></div>)}</article>
      <article className="leader-card governorates-card"><h3>أفضل المحافظات</h3>{governorateRanks.map(([name, points], index) => <div className="rank-row" key={name}><b className="rank-medal">{index + 1}</b><div><strong>{name}</strong><small>ترتيب المحافظات</small></div><em>{points} نقطة</em></div>)}</article>
    </div>
  </section>;
}

function Wheel() {
  const [whatsapp, setWhatsapp] = useState(""); const [rotation, setRotation] = useState(0); const [spinning, setSpinning] = useState(false); const [result, setResult] = useState(null);
  const spin = () => {
    const digits = whatsapp.replace(/\D/g, ""); const date = todayCairo();
    if (!digits || spinning) return;
    if (getSpins().some((row) => row.whatsapp === digits && row.date === date)) return setResult({ title: "لفتك خلصت النهارده", message: "ارجع لنا بكرة وجرب حظك من جديد." });
    const prize = wheelPrizes[Math.floor(Math.random() * wheelPrizes.length)];
    setSpinning(true); setRotation((value) => value + 1440);
    setTimeout(() => { saveSpin({ whatsapp: digits, date, prize, createdAt: new Date().toISOString() }); setResult(prize === "حظ أوفر" ? { title: "حظ أوفر", message: "ارجع لنا بكرة وجرب حظك من جديد." } : { title: "مبروك", prize, message: "فريق كريم فارما هيتواصل معاك لتأكيد الجائزة." }); setSpinning(false); }, 3000);
  };
  return <section className="page wrap wheel-layout">
    <div><SectionTitle eyebrow="جوائز يومية للصيدليات" title="لف واربح مع كريم فارما" text="ادخل رقم واتساب وخد لفتك اليومية." /><div className="wheel-prizes">{wheelPrizes.slice(0, 6).map((prize) => <span key={prize}>✓ {prize}</span>)}</div><div className="wheel-form"><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="رقم واتساب" /><button className="btn primary" onClick={spin}>{spinning ? "العجلة بتلف..." : "لف العجلة"}</button></div><small className="availability">لفة واحدة كل يوم لكل رقم واتساب.</small></div>
    <div className="wheel-stage"><div className="wheel-pointer">▼</div><div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>{wheelPrizes.map((prize, index) => <span style={{ transform: `rotate(${index * 51.4}deg)` }} key={prize}>{prize}</span>)}</div></div><img className="wheel-box visible-box" src={assetPaths.cheerBox} alt="بوكس التشجيع" />
    {result && <WheelResult result={result} onClose={() => setResult(null)} />}
  </section>;
}
function WheelResult({ result, onClose }) { return <div className="wheel-result-modal" role="dialog" aria-modal="true"><div><span>عجلة كريم فارما</span><h2>{result.title}</h2>{result.prize && <><p>لقد ربحت:</p><strong>{result.prize}</strong></>}<small>{result.message}</small><button className="btn primary" onClick={onClose}>تمام</button></div></div>; }

function OfferCard({ offer }) { const whatsappUrl = `https://wa.me/${campaign.whatsappNumber}?text=${encodeURIComponent(offer.whatsappCTA || "السلام عليكم، أرغب في الاستفادة من عرض البطولة من كريم فارما.")}`; return <article className={`offer-card ${offer.id === 1 ? "featured-offer" : ""}`}><img className="offer-banner" src={offer.bannerImage} alt="" /><div><span>{offer.validUntil}</span><h4>{offer.title}</h4><p>{offer.description}</p><a href={whatsappUrl} target="_blank" rel="noreferrer">اطلب العرض على واتساب</a></div></article>; }
function Offers() { return <section className="page wrap"><SectionTitle eyebrow="خصيصًا للصيدليات" title="عروض كريم فارما" text="اختار العرض واطلبه مباشرة على واتساب." />{[...new Set(offers.map((offer) => offer.section))].map((section) => <div className="offers-section" key={section}><h3>{section}</h3><div className="offers-grid">{offers.filter((offer) => offer.section === section).map((offer) => <OfferCard offer={offer} key={offer.id} />)}</div></div>)}</section>; }

function BranchMap() { const mapRef = useRef(null); const locations = branches.filter((branch) => branch.lat && branch.lng); useEffect(() => { if (!locations.length || !mapRef.current) return; let map; import("leaflet").then((L) => { map = L.map(mapRef.current).setView([locations[0].lat, locations[0].lng], 10); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map); locations.forEach((branch) => L.marker([branch.lat, branch.lng]).addTo(map).bindPopup(branch.name)); }); return () => map?.remove(); }, []); return locations.length ? <div className="branch-map" ref={mapRef} /> : <div className="branch-map-empty">تواصل معنا لمعرفة أقرب فرع كريم فارما.</div>; }
function Branches() { return <section className="page wrap"><SectionTitle eyebrow="خدمة الصيدليات" title="فروع كريم فارما" text="فريقنا يساعدك في الوصول لأقرب فرع." /><BranchMap /><div className="branches-grid">{branches.map((branch) => <article className="branch-card" key={branch.id}><h3>{branch.name}</h3><p>{branch.address || "تواصل معنا لمعرفة تفاصيل الفرع."}</p>{branch.googleMapsUrl && <a href={branch.googleMapsUrl} target="_blank" rel="noreferrer">افتح على الخريطة</a>}</article>)}</div></section>; }

function Rules() { return <section className="page wrap rules-layout"><div><SectionTitle eyebrow="ببساطة" title="قواعد المشاركة" /><div className="rules-card">{["التوقعات مفتوحة لأول ٣ أيام من البطولة ولكل مباريات منتخب مصر.", "توقع واحد لكل صيدلية ورقم واتساب لكل مباراة.", "يمكن تعديل التوقع قبل بداية المباراة.", "الفائزون يتم التواصل معهم عبر واتساب.", "الجوائز تخضع للتوافر وشروط الحملة."].map((rule, index) => <p key={rule}><b>{index + 1}</b>{rule}</p>)}</div></div><article className="prize-card"><img src={assetPaths.cheerBox} alt="بوكس التشجيع" /><h2>بوكس التشجيع من كريم فارما</h2><p>تيشيرت منتخب مصر + كاب تشجيع + هدايا ومفاجآت مجانية.</p></article></section>; }

function AdminDemo() {
  const [predictions, setPredictions] = useState(getPredictions); const [spins, setSpins] = useState(getSpins); const [results, setResults] = useState(getMatchResults); const [resultForm, setResultForm] = useState({ id: "1", scoreA: "", scoreB: "", status: "finished" });
  const downloadCsv = (rows, name, fields = Object.keys(rows[0] || {})) => { if (!rows.length) return; const csv = [fields, ...rows.map((row) => fields.map((field) => `"${String(row[field] ?? "").replaceAll('"', '""')}"`))].map((row) => row.join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = name; link.click(); URL.revokeObjectURL(link.href); };
  const predictionFields = ["pharmacyName", "contactName", "whatsapp", "governorate", "customerCode", "isCurrentCustomer", "onlineOrderingInterest", "currentOrderingMethod", "wantsContact", "favoriteTeams", "matchId", "prediction", "createdAt", "updatedAt"];
  const saveResult = (event) => { event.preventDefault(); saveMatchResult({ ...resultForm, scoreA: Number(resultForm.scoreA), scoreB: Number(resultForm.scoreB) }); setResults(getMatchResults()); };
  const clear = () => { if (window.confirm("مسح كل البيانات التجريبية؟")) { clearDemoData(); setPredictions([]); setSpins([]); setResults([]); } };
  return <section className="page wrap admin-page"><div className="admin-note">وضع تجريبي محلي - سيتم استبداله لاحقًا بقاعدة بيانات Supabase</div><SectionTitle eyebrow="للعرض التجريبي" title="لوحة المتابعة المحلية" /><div className="admin-stats"><article><b>{predictions.length}</b><span>توقعات</span></article><article><b>{spins.length}</b><span>لفات عجلة</span></article><article><b>{results.length}</b><span>نتائج</span></article></div><div className="admin-actions"><button onClick={() => downloadCsv(predictions, "predictions.csv", predictionFields)}>تصدير التوقعات CSV</button><button onClick={() => downloadCsv(spins, "wheel-spins.csv")}>تصدير اللفات CSV</button><button className="danger" onClick={clear}>مسح البيانات</button></div><form className="admin-result-form" onSubmit={saveResult}><h3>تحديث نتيجة محلية</h3><select value={resultForm.id} onChange={(e) => setResultForm({ ...resultForm, id: e.target.value })}>{matchesData.map((match) => <option key={match.id} value={match.id}>#{match.id} {match.teamA} - {match.teamB}</option>)}</select><input required type="number" min="0" value={resultForm.scoreA} onChange={(e) => setResultForm({ ...resultForm, scoreA: e.target.value })} placeholder="نتيجة الفريق الأول" /><input required type="number" min="0" value={resultForm.scoreB} onChange={(e) => setResultForm({ ...resultForm, scoreB: e.target.value })} placeholder="نتيجة الفريق الثاني" /><button>حفظ النتيجة</button></form></section>;
}
function NotFound() { return <section className="page narrow wrap"><EmptyCard text="الصفحة مش موجودة." /><Link className="btn primary back-link" to="/">ارجع للرئيسية</Link></section>; }
export default App;
