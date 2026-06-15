import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import matchesData from "./data/fixtures.json";
import offers from "./data/offers.json";
import branches from "./data/branches.json";
import { campaign } from "./config/campaign";
import LoyaltyPreviewApp from "./loyaltyPreview/LoyaltyPreviewApp";
import PreviewV2 from "./ui-rebuild-v2/PreviewV2";
import "leaflet/dist/leaflet.css";
import {
  clearDemoData,
  getAppOrdersProgress,
  getDrawEntries,
  getLeadEvents,
  getMatchResults,
  getPointsLedger,
  getProfile,
  getPredictions,
  getSpins,
  saveMatchResult,
} from "./services/storage";
import {
  loadAdminTables,
  normalizeWhatsapp,
  spinWheel,
  submitPrediction,
  trackLeadEvent,
  upsertPharmacy
} from "./services/campaignData";
import { isSupabaseConfigured } from "./services/supabaseClient";
import {
  awardAppInterestPoints,
  awardContactRequestPoints,
  awardRegistrationBonus,
  getLeaderboard as getPointsLeaderboard,
  getPharmacyDashboard,
  getPharmacyTotalPoints,
  addManualPoints,
  markGrandDrawQualified,
  updateAppOrdersProgress,
  scoreMatchPredictions
} from "./services/pointsService";

const { assetPaths } = campaign;
const governorates = ["القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "الغربية", "المنوفية", "القليوبية", "البحيرة", "الفيوم", "المنيا", "أسيوط", "سوهاج", "قنا", "أسوان", "أخرى"];
const wheelPrizes = ["+10 نقطة", "+30 نقطة", "+50 نقطة", "+100 نقطة", "حظ أوفر", "جرّب تاني بكرة", "دخول سحب خاص", "كاب تشجيع", "خصم خاص", "هدية مفاجأة"];
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
const trackClick = (eventType, source) => () => void trackLeadEvent(eventType, { source });
const trackClicks = (...events) => () => events.forEach(([eventType, source, data = {}]) => void trackLeadEvent(eventType, { source, ...data }));

function App() {
  return <Routes>
    <Route path="/preview-v2" element={<PreviewV2 />} />
    <Route path="/preview-loyalty/*" element={<LoyaltyPreviewApp />} />
    <Route path="*" element={<ProductionApp />} />
  </Routes>;
}

function ProductionApp() {
  return <div className="app-shell">
    <div className="campaign-lights" />
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
    <Footer /><Link className="floating-predict" to="/matches">زود نقاطك</Link><BottomNav />
  </div>;
}

function Header() {
  const profile = getProfile();
  return <header className="site-header">
    <Link to="/" className="brand"><img src={assetPaths.logo} alt="كريم فارما" /></Link>
    <nav className="desktop-nav">{desktopNav.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
    {profile?.pharmacyName && <span className="header-greeting">أهلاً {profile.pharmacyName}</span>}
    <a className="header-cta" href={contactUrl} target="_blank" rel="noreferrer" onClick={trackClick("whatsapp_clicked", "header")}>تواصل معنا</a>
  </header>;
}
function AnnouncementBar() { return <div className="announcement"><div>{Array.from({ length: 3 }, (_, index) => <span key={index}>حملة للصيدليات فقط • سجل صيدليتك وخد 100 نقطة • جرّب تطبيق كريم فارما واجمع نقاط أكتر</span>)}</div></div>; }

function BottomNav() {
  return <nav className="bottom-nav">
    {[
      ["/", "⌂", "الرئيسية"],
      ["/#today", "+", "نقاط"],
      ["/matches", "★", "توقع"],
      ["/wheel", "✦", "العجلة"],
      ["/offers", "٪", "العروض"]
    ].map(([to, icon, label]) => <NavLink key={to} to={to}><b>{icon}</b><span>{label}</span></NavLink>)}
  </nav>;
}

function Footer() {
  return <footer>
    <p>دوري الصيدليات مع كريم فارما: نقاط وسحوبات للصيدليات أثناء كأس العالم</p>
    <div className="footer-links">
      <a href={contactUrl} target="_blank" rel="noreferrer" onClick={trackClick("whatsapp_clicked", "footer")}>واتساب: 01145000445</a>
      <a href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">فيسبوك كريم فارما</a>
      <Link to="/branches">فروع كريم فارما</Link>
    </div>
  </footer>;
}

function SectionTitle({ eyebrow, title, text, action, link }) {
  return <div className="section-title-row"><div className="section-title"><span>{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>{action && <Link to={link}>{action} ←</Link>}</div>;
}

const emptyProfile = { pharmacyName: "", contactName: "", whatsapp: "", governorate: "", customerCode: "", isCurrentCustomer: "", onlineOrderingInterest: "", currentOrderingMethod: "", wantsContact: "", favoriteTeams: "" };

function CampaignRegistration({ onRegistered }) {
  const [form, setForm] = useState(emptyProfile); const [submitting, setSubmitting] = useState(false); const [notice, setNotice] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setSubmitting(true); setNotice("");
    try {
      const saved = await upsertPharmacy(form);
      const pharmacyId = saved.pharmacy?.id || `local:${normalizeWhatsapp(form.whatsapp)}`;
      await awardRegistrationBonus(pharmacyId);
      if (form.wantsContact === "نعم") await awardContactRequestPoints(pharmacyId);
      onRegistered({ ...form, whatsapp: normalizeWhatsapp(form.whatsapp) });
    } catch (error) { console.error("[Registration]", error); setNotice("حصلت مشكلة بسيطة. حاول تسجل صيدليتك مرة تانية."); }
    finally { setSubmitting(false); }
  };
  return <section id="register" className="wrap campaign-section registration-feature">
    <div><span>ابدأ من هنا</span><h2>سجل صيدليتك وخد 100 نقطة فورًا</h2><p>بيانات بسيطة تفتح لك التوقعات والعجلة ونظام نقاط دوري الصيدليات.</p></div>
    <form onSubmit={submit}>
      <input required placeholder="اسم الصيدلية" value={form.pharmacyName} onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })} />
      <input required placeholder="اسم الصيدلي أو المسؤول" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
      <input required inputMode="tel" placeholder="رقم واتساب" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
      <select required value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })}><option value="">اختار المحافظة</option>{governorates.map((value) => <option key={value}>{value}</option>)}</select>
      <RadioField label="هل ترغب أن يتواصل معك فريق كريم فارما؟" name="register-contact" options={["نعم", "لا"]} required={false} value={form.wantsContact} onChange={(value) => setForm({ ...form, wantsContact: value })} />
      {notice && <div className="notice">{notice}</div>}<button className="btn primary" disabled={submitting}>{submitting ? "جاري تسجيل صيدليتك..." : "سجل صيدليتك وخد 100 نقطة"}</button>
    </form>
  </section>;
}

function EarnPoints() {
  const items = [["تسجيل الصيدلية", "100 نقطة"], ["توقع مباراة", "10 نقاط"], ["لف العجلة يوميًا", "5 نقاط"], ["تحميل / تجربة تطبيق كريم فارما", "100 نقطة"], ["أول طلب من التطبيق", "200 نقطة"], ["كل طلب من التطبيق", "50 نقطة"], ["10 طلبات من التطبيق", "1000 نقطة + دخول السحب الكبير"]];
  return <section id="points" className="wrap campaign-section earn-points"><SectionTitle eyebrow="كل خطوة ليها مكافأة" title="كيف تزود نقاطك؟" text="اجمع نقاط أكتر وارفع ترتيب صيدليتك في دوري كريم فارما." /><div>{items.map(([label, points]) => <article key={label}><b>{points}</b><span>{label}</span></article>)}</div></section>;
}

function OnboardingSteps() {
  const steps = ["سجل صيدليتك", "خد 100 نقطة فورًا", "توقع مباريات كأس العالم", "لف عجلة الحظ يوميًا", "استخدم تطبيق كريم فارما", "ادخل السحوبات والجوائز"];
  return <div className="onboarding-steps">{steps.map((step, index) => <span key={step}><b>{index + 1}</b>{step}</span>)}</div>;
}

function PrizeStructure({ compact = false }) {
  const prizes = [
    ["أفضل 5 صيدليات في النقاط", "بوكس التشجيع من كريم فارما، أو بوكس كريم فارما بضاعة مجانية، أو خصم خاص على المسحوبات."],
    ["سحب التطبيق", "أي صيدلية تحقق 10 طلبات من تطبيق كريم فارما تدخل السحب الكبير. عدد الفائزين قد يصل إلى 50 فائز."],
    ["مباريات مصر", "سحوبات خاصة على توقعات مباريات منتخب مصر."],
    ["المباريات الجماهيرية", "سحوبات خاصة في المباريات الكبرى."]
  ];
  return <section className={`wrap campaign-section prize-structure ${compact ? "compact" : ""}`}><SectionTitle eyebrow="جوائز الحملة" title="جوائز الحملة" text="هيكل واضح للجوائز حتى تعرف صيدليتك ما الذي تنافس عليه." /><div className="prize-zone-grid">{prizes.map(([title, text]) => <article className="prize-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}</div></section>;
}

function AppLaunch({ profile, onReward }) {
  const openContact = () => window.open(contactUrl, "_blank", "noopener,noreferrer");
  const click = async (event) => {
    event.preventDefault();
    const dashboard = profile?.whatsapp ? await getPharmacyDashboard(profile) : null;
    await trackLeadEvent("app_cta_clicked", { source: "home_app" }, dashboard?.pharmacyId);
    await trackLeadEvent("whatsapp_clicked", { source: "home_app" }, dashboard?.pharmacyId);
    if (dashboard?.pharmacyId) { await awardAppInterestPoints(dashboard.pharmacyId); onReward?.(); }
    openContact();
  };
  const contactClick = async (event) => {
    event.preventDefault();
    const dashboard = profile?.whatsapp ? await getPharmacyDashboard(profile) : null;
    await trackLeadEvent("contact_request_clicked", { source: "app_contact" }, dashboard?.pharmacyId);
    await trackLeadEvent("whatsapp_clicked", { source: "app_contact" }, dashboard?.pharmacyId);
    if (dashboard?.pharmacyId) { await awardContactRequestPoints(dashboard.pharmacyId); onReward?.(); }
    openContact();
  };
  return <section className="wrap app-promo app-launch campaign-section"><div><span>حملة إطلاق تطبيق كريم فارما للصيدليات أثناء كأس العالم</span><h2>اطلب من تطبيق كريم فارما واجمع نقاط أكتر</h2><p>كل طلب من تطبيق كريم فارما خلال فترة البطولة يقرب صيدليتك من السحب الكبير.</p><div className="app-rewards"><b>أول طلب <small>+200 نقطة</small></b><b>كل طلب <small>+50 نقطة</small></b><b>10 طلبات <small>+1000 نقطة + دخول السحب الكبير</small></b></div><div className="actions"><a className="btn primary" href={contactUrl} target="_blank" rel="noreferrer" onClick={click}>جرّب تطبيق كريم فارما</a><a className="btn ghost" href={contactUrl} target="_blank" rel="noreferrer" onClick={contactClick}>اطلب من فريق كريم فارما يتواصل معك</a></div></div><b>APP</b></section>;
}

function Home() {
  const matches = getMatches(); const openMatches = matches.filter(canPredict); const [profile, setProfile] = useState(getProfile); const [dashboard, setDashboard] = useState(null); const refresh = () => profile?.whatsapp && getPharmacyDashboard(profile).then(setDashboard).catch((error) => console.error("[Dashboard]", error));
  useEffect(refresh, [profile?.whatsapp]);
  const predictions = getPredictions().filter((row) => normalizeWhatsapp(row.whatsapp) === profile?.whatsapp).length; const spins = getSpins().filter((row) => normalizeWhatsapp(row.whatsapp) === profile?.whatsapp).length;
  return <>
    <section className="hero hero-compact wrap loyalty-hero">
      <div className="hero-copy">{profile?.pharmacyName && <div className="pharmacy-greeting">أهلاً {profile.pharmacyName}</div>}<span className="pill">حملة إطلاق تطبيق كريم فارما للصيدليات أثناء كأس العالم</span><h1><em>دوري الصيدليات مع كريم فارما</em></h1><p>شجع مصر، اجمع نقاط، واكسب مع كريم فارما</p><small>سجل صيدليتك الآن واحصل على 100 نقطة افتتاحية، وشارك في توقعات كأس العالم وعجلة الحظ وسحوبات تطبيق كريم فارما.</small>{!profile && <OnboardingSteps />}<div className="actions">{profile ? <><a className="btn primary" href="#predict-now">زود نقاطك الآن</a><Link className="btn ghost" to="/wheel">لف العجلة اليومية</Link></> : <><a className="btn primary" href="#register">سجل صيدليتك وخد 100 نقطة</a><a className="btn ghost" href="#points">اعرف نظام النقاط</a></>}</div></div>
      <div className="hero-visual"><img className="flag-backdrop" src={assetPaths.egyptFlag} alt="" /><img className="cheer-box hero-box" src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" /></div>
    </section>
    {!profile && <CampaignRegistration onRegistered={setProfile} />}
    {profile && <section className="wrap campaign-section pharmacy-dashboard"><div><span>رصيد صيدليتك</span><h2>أهلاً {profile.pharmacyName}</h2><p>اختار خطوتك الجاية وزود فرصك في الجوائز.</p></div><div className="dashboard-grid">{[["رصيدك الحالي", `${dashboard?.points || 0} نقطة`], ["ترتيبك", dashboard?.rank ? `#${dashboard.rank}` : "ابدأ اجمع نقاط"], ["توقعاتك", predictions], ["لفات العجلة", spins], ["طلبات التطبيق", `${dashboard?.orderCount || 0} / 10`]].map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}</div></section>}
    <EarnPoints />
    <section id="predict-now" className="wrap prediction-spotlight campaign-section"><div className="prediction-spotlight-head"><div><span>زود نقاطك الآن</span><h2>توقعات مفتوحة: كل مباراة = 10 نقاط</h2><p>اختار المباراة وثبت توقع صيدليتك.</p></div><b>{openMatches.length}<small>مباراة مفتوحة</small></b></div><div className="home-match-grid">{openMatches.slice(0, 4).map((match) => <MatchCard match={match} key={match.id} />)}</div><div className="prediction-actions"><Link className="btn primary" to="/matches">كل المباريات المفتوحة</Link><Link className="subtle-link" to="/matches">جدول البطولة كامل ←</Link></div></section>
    <section className="wrap wheel-home-feature campaign-section"><div><span>+5 نقاط مشاركة يوميًا</span><h2>لف العجلة اليومية</h2><p>كل لفة تضيف نقاط مشاركة، وممكن تكسب نقاط أو جائزة إضافية.</p><Link className="btn primary" to="/wheel">لف العجلة الآن</Link></div><b>✦</b></section>
    <AppLaunch profile={profile} onReward={refresh} />
    <PrizeStructure compact />
    <section className="wrap campaign-section"><SectionTitle eyebrow="للصيدليات" title="عروض كريم فارما" action="شوف كل العروض" link="/offers" /><div className="offers-grid preview-grid">{offers.slice(0, 3).map((offer) => <OfferCard offer={offer} key={offer.id} />)}</div></section>
    <section className="wrap about-kareem campaign-section"><div><span>ثقة وخبرة من ٢٠٠٥</span><h2>من هي كريم فارما؟</h2><p>كريم فارما شركة مصرية متخصصة في توزيع الأدوية تأسست عام 2005.</p><p>تُعد واحدة من أكبر شركات توزيع الأدوية في مصر، وحاصلة على شهادة GSDP الخاصة بجودة التخزين والتوزيع الدوائي.</p><p>يرأسها د. رفاعي ربيع رئيس لجنة الموزعين بالشعبة العامة للأدوية.</p><p>هدفنا تقديم خدمة توزيع احترافية تساعد الصيدليات على النمو وتحقيق أفضل تجربة شراء.</p></div><div className="trust-badges"><b>٢٠٠٥<small>خبرة ممتدة</small></b><b>✓<small>جودة GSDP</small></b><b>★<small>توزيع للصيدليات</small></b></div></section>
    <section className="wrap results-home campaign-section"><div><span>كأس العالم 2026</span><h2>مباريات مصر وجدول البطولة</h2></div><div><Link className="btn primary" to="/matches">شوف المباريات</Link><Link className="btn ghost" to="/results">النتائج</Link></div></section>
    <section className="wrap contact-feature campaign-section"><div><span>فريقنا معاك</span><h2>تواصل مع كريم فارما</h2><p>اسأل عن التطبيق والعروض وخدمات الصيدليات.</p></div><div><a className="btn primary" href={contactUrl} target="_blank" rel="noreferrer" onClick={trackClick("whatsapp_clicked", "home_contact")}>واتساب 01145000445</a><a className="btn ghost" href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">فيسبوك</a></div></section>
  </>;
}

function EmptyCard({ text }) { return <div className="empty-card">{text}</div>; }
function TeamFlag({ src, name }) { return src ? <img className="team-flag" src={src} alt={`علم ${name}`} /> : <b className="unknown-flag">؟</b>; }

function MatchCard({ match, noAction = false, resultOnly = false }) {
  const state = getMatchState(match);
  return <article className="match-card">
    <div className="match-meta"><span>{match.stage}{match.group && ` • ${match.group}`}</span><MatchStateBadge state={state} /></div>
    <div className="teams"><div><TeamFlag src={match.teamAFlag} name={match.teamA} /><strong>{match.teamA}</strong></div><span>{match.status === "finished" ? `${match.scoreA} - ${match.scoreB}` : "ضد"}</span><div><TeamFlag src={match.teamBFlag} name={match.teamB} /><strong>{match.teamB}</strong></div></div>
    <div className="match-bottom"><small>{cairoDate(match)} • {cairoTime(match)}</small>{!noAction && !resultOnly && (state === "open" ? <Link to={`/predict/${match.id}`}>توقع المباراة</Link> : <button disabled>{state === "upcoming" ? "يفتح التوقع قريبًا" : "تم غلق التوقع"}</button>)}</div>
  </article>;
}
function getMatchState(match) { if (match.status === "finished") return "finished"; if (isStarted(match)) return "closed"; return canPredict(match) ? "open" : "upcoming"; }
function MatchStateBadge({ state }) { return <i className={`status ${state}`}>{({ open: "التوقعات مفتوحة", upcoming: "يفتح التوقع قريبًا", closed: "تم غلق التوقع", finished: "انتهت المباراة" })[state]}</i>; }

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
    <div className="featured-egypt"><img src={assetPaths.egyptFlag} alt="" /><div><h3>مباريات منتخب مصر</h3><p>سجل توقع صيدليتك قبل المباراة واجمع نقاط الحملة.</p></div><span>{matches.filter((match) => match.teamA === "مصر" || match.teamB === "مصر").length} مباريات</span></div>
    <div className="filter-panel"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="دور على فريق..." /><select value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">كل الأدوار</option>{[...new Set(matches.map((match) => match.stage))].map((value) => <option key={value}>{value}</option>)}</select><div className="filter-chips">{[["all", "الكل"], ["today", "اليوم"], ["tomorrow", "بكرة"], ["upcoming", "القادمة"], ["finished", "النتائج"]].map(([value, label]) => <button className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div></div>
    <div className="matches-grid">{filtered.map((match) => <MatchCard match={match} key={match.id} />)}</div>{!filtered.length && <EmptyCard text="مفيش مباريات مطابقة للبحث." />}
  </section>;
}

function MatchDetails() {
  const { id } = useParams(); const match = getMatches().find((row) => row.id === id);
  if (!match) return <NotFound />;
  return <section className="page narrow wrap"><SectionTitle eyebrow="تفاصيل المباراة" title="تفاصيل المباراة" /><MatchCard match={match} noAction />{canPredict(match) ? <div className="center-action"><Link className="btn primary" to={`/predict/${id}`}>سجل توقع صيدليتك</Link></div> : <div className="notice">التوقع هيفتح قريبًا. تابع المباريات المفتوحة من الصفحة الرئيسية.</div>}</section>;
}

function Prediction() {
  const { id } = useParams(); const navigate = useNavigate(); const match = getMatches().find((row) => row.id === id);
  const keyBase = (whatsapp, pharmacyName) => `${pharmacyName.trim()}_${normalizeWhatsapp(whatsapp)}_${id}`;
  const initial = { pharmacyName: "", contactName: "", whatsapp: "", governorate: "", customerCode: "", isCurrentCustomer: "", onlineOrderingInterest: "", currentOrderingMethod: "", wantsContact: "", favoriteTeams: "", scoreA: "", scoreB: "", consent: false, ...getProfile() };
  const [form, setForm] = useState(initial); const [success, setSuccess] = useState(""); const [successPoints, setSuccessPoints] = useState(false); const [locked, setLocked] = useState(false); const [submitting, setSubmitting] = useState(false); const [errorMessage, setErrorMessage] = useState("");
  if (!match) return <NotFound />;
  if (!canPredict(match)) return <section className="page narrow wrap"><SectionTitle eyebrow="التوقعات" title="التوقع هيفتح قريبًا" /><MatchCard match={match} noAction /><div className="notice">تابع المباريات المفتوحة من الصفحة الرئيسية.</div><Link className="btn ghost back-link" to="/matches">ارجع لجدول المباريات</Link></section>;
  const submit = async (event) => {
    event.preventDefault();
    if (locked || isStarted(match)) return setLocked(true);
    setSubmitting(true); setErrorMessage("");
    try {
      const result = await submitPrediction({ profile: form, match, scoreA: form.scoreA, scoreB: form.scoreB, key: keyBase(form.whatsapp, form.pharmacyName) });
      setSuccess(result.updated ? "تم تحديث توقع صيدليتك بنجاح" : "تم تسجيل توقع صيدليتك بنجاح");
      setSuccessPoints(Boolean(result.reward?.awarded));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("[Prediction submit]", error);
      setErrorMessage("حصلت مشكلة بسيطة. حاول تسجل توقعك مرة تانية.");
    } finally {
      setSubmitting(false);
    }
  };
  const findExisting = (next) => { const row = getPredictions().find((item) => item.key === keyBase(next.whatsapp, next.pharmacyName)); if (row) setForm(row); setLocked(Boolean(row && isStarted(match))); };
  if (success) return <section className="page narrow wrap"><div className="success-card"><img src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" /><h1>{success}</h1>{successPoints && <strong className="points-earned">تم إضافة 10 نقاط لرصيدك</strong>}<p>بالتوفيق في دوري الصيدليات وسحوبات كريم فارما</p><button onClick={() => navigate("/wheel")} className="btn primary">لف العجلة وخد 5 نقاط</button></div></section>;
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
    <label className="consent"><input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /> أوافق على استقبال تنبيهات المباريات والعروض من كريم فارما</label>{errorMessage && <div className="notice">{errorMessage}</div>}<button className="btn primary submit" disabled={locked || submitting}>{submitting ? "جاري تسجيل التوقع..." : "ثبت توقع صيدليتك"}</button>
  </form></section>;
}
function RadioField({ label, name, options, value, onChange, required = true }) { return <div className="field"><label>{label}</label><div className="radio-grid">{options.map((option) => <label key={option}><input required={required} type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />{option}</label>)}</div></div>; }

function Results() { const finished = getMatches().filter((match) => match.status === "finished"); return <section className="page wrap"><SectionTitle eyebrow="النتائج" title="نتائج المباريات" text="كل النتائج بتوقيت القاهرة." />{finished.length ? <div className="matches-grid">{finished.map((match) => <MatchCard match={match} noAction resultOnly key={match.id} />)}</div> : <EmptyCard text="النتائج هتظهر هنا مع بداية البطولة." />}</section>; }

function Leaderboard() {
  const [rankedPharmacies, setRankedPharmacies] = useState(null);
  useEffect(() => { getPointsLeaderboard().then((rows) => rows && setRankedPharmacies(rows)).catch((error) => console.error("[Leaderboard]", error)); }, []);
  const governorateRanks = [["القاهرة", 448], ["الدقهلية", 382], ["الشرقية", 341]];
  const rows = rankedPharmacies?.length ? rankedPharmacies.slice(0, 10).map(({ name, governorate, points }) => [name, governorate, points]) : pharmacies;
  return <section className="page wrap">
    <SectionTitle eyebrow="دوري الصيدليات مع كريم فارما" title="لوحة شرف الصيدليات" text="الترتيب حسب إجمالي نقاط صيدليتك في الحملة." />
    <div className="leader-highlight"><b>Top 5</b><div><span>المنافسة مستمرة</span><h3>خلي صيدليتك في أول القائمة</h3><p>شارك توقعاتك واجمع نقاط أكتر مع كل مباراة وطلب من التطبيق.</p></div></div>
    <div className="leader-grid">
      <article className="leader-card"><h3>منطقة جوائز أفضل 5 صيدليات</h3>{rows.map(([name, governorate, points], index) => <div className={`rank-row ${index < 5 ? "top-rank" : ""}`} key={`${name}-${index}`}><b className="rank-medal">{index + 1}</b><div><strong>{name}</strong><small>{governorate} • {points >= 500 ? "صيدلية من النخبة" : points >= 200 ? "صيدلية منافسة" : "صيدلية مشاركة"}</small></div><em>{points} نقطة</em></div>)}</article>
      <article className="leader-card governorates-card"><h3>أفضل المحافظات</h3>{governorateRanks.map(([name, points], index) => <div className="rank-row" key={name}><b className="rank-medal">{index + 1}</b><div><strong>{name}</strong><small>ترتيب المحافظات</small></div><em>{points} نقطة</em></div>)}</article>
    </div>
  </section>;
}

function Wheel() {
  const [whatsapp, setWhatsapp] = useState(""); const [rotation, setRotation] = useState(0); const [spinning, setSpinning] = useState(false); const [result, setResult] = useState(null);
  const spin = async () => {
    const digits = normalizeWhatsapp(whatsapp); const date = todayCairo();
    if (!digits || spinning) return;
    const prize = wheelPrizes[Math.floor(Math.random() * wheelPrizes.length)];
    setSpinning(true);
    try {
      const profile = getProfile() || {}; const saved = await spinWheel({ whatsapp: digits, date, prize, profile });
      const total = await getPharmacyTotalPoints(saved.pharmacyId || `local:${digits}`);
      if (saved.repeated) {
        setSpinning(false);
        return setResult(toWheelResult(saved.prize, true, total, profile.pharmacyName));
      }
      setRotation((value) => value + 1440);
      setTimeout(() => { setResult(toWheelResult(saved.prize, false, total, profile.pharmacyName)); setSpinning(false); }, 3000);
    } catch (error) {
      console.error("[Wheel spin]", error);
      setSpinning(false);
      setResult({ title: "حاول مرة تانية", message: "حصلت مشكلة بسيطة أثناء تسجيل اللفة." });
    }
  };
  return <section className="page wrap wheel-layout">
    <div><SectionTitle eyebrow="+5 نقاط مشاركة يوميًا" title="لف واربح مع كريم فارما" text="كل لفة تضيف 5 نقاط لصيدليتك، والجائزة ممكن تزود رصيدك أكتر." /><div className="wheel-prizes">{wheelPrizes.map((prize) => <span key={prize}>✓ {prize}</span>)}</div><div className="wheel-form"><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="رقم واتساب الصيدلية" /><button className="btn primary" onClick={spin}>{spinning ? "العجلة بتلف..." : "لف العجلة"}</button></div><small className="availability">لفة واحدة كل يوم لكل صيدلية.</small></div>
    <div className="wheel-stage"><div className="wheel-pointer">▼</div><div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>{wheelPrizes.map((prize, index) => <span style={{ transform: `rotate(${index * 36}deg)` }} key={prize}>{prize}</span>)}</div></div><img className="wheel-box visible-box" src={assetPaths.cheerBox} alt="بوكس التشجيع" />
    {result && <WheelResult result={result} onClose={() => setResult(null)} />}
  </section>;
}
function toWheelResult(prize, repeated = false, total = 0, pharmacyName = "") {
  const noPrize = ["حظ أوفر", "جرّب تاني بكرة"].includes(prize);
  const pointPrize = prize.match(/\+?(\d+)\s*نق/);
  return {
    title: noPrize ? "حظ أوفر" : `مبروك${pharmacyName ? ` يا ${pharmacyName}` : ""}`,
    winLine: noPrize ? "" : pointPrize ? `كسبت ${pointPrize[1]} نقطة` : `كسبت ${prize}`,
    total,
    message: repeated ? "دي نفس نتيجة لفتك المسجلة لليوم، بدون نقاط إضافية." : noPrize ? "تم إضافة 5 نقاط مشاركة لرصيدك. جرب تاني بكرة." : "تم إضافة نقاط المشاركة والجائزة لرصيد صيدليتك."
  };
}
function WheelResult({ result, onClose }) { return <div className="wheel-result-modal" role="dialog" aria-modal="true"><div><span>عجلة دوري الصيدليات</span><h2>{result.title}</h2>{result.winLine && <strong>{result.winLine}</strong>}<small>{result.message}</small><b className="modal-balance">رصيدك الحالي: {result.total} نقطة</b><button className="btn primary" onClick={onClose}>تمام</button></div></div>; }

function OfferCard({ offer }) { const whatsappUrl = `https://wa.me/${campaign.whatsappNumber}?text=${encodeURIComponent(offer.whatsappCTA || "السلام عليكم، أرغب في الاستفادة من عرض البطولة من كريم فارما.")}`; return <article className={`offer-card ${offer.id === 1 ? "featured-offer" : ""}`}><img className="offer-banner" src={offer.bannerImage} alt="" /><div><span>{offer.validUntil}</span><h4>{offer.title}</h4><p>{offer.description}</p><a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={trackClicks(["offer_clicked", "offers", { offer_id: offer.id, title: offer.title }], ["whatsapp_clicked", "offer", { offer_id: offer.id }])}>اطلب العرض على واتساب</a></div></article>; }
function Offers() { return <section className="page wrap"><SectionTitle eyebrow="خصيصًا للصيدليات" title="عروض كريم فارما" text="اختار العرض واطلبه مباشرة على واتساب." />{[...new Set(offers.map((offer) => offer.section))].map((section) => <div className="offers-section" key={section}><h3>{section}</h3><div className="offers-grid">{offers.filter((offer) => offer.section === section).map((offer) => <OfferCard offer={offer} key={offer.id} />)}</div></div>)}</section>; }

function BranchMap() { const mapRef = useRef(null); const locations = branches.filter((branch) => branch.lat && branch.lng); useEffect(() => { if (!locations.length || !mapRef.current) return; let map; import("leaflet").then((L) => { map = L.map(mapRef.current).setView([locations[0].lat, locations[0].lng], 10); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map); locations.forEach((branch) => L.marker([branch.lat, branch.lng]).addTo(map).bindPopup(branch.name)); }); return () => map?.remove(); }, []); return locations.length ? <div className="branch-map" ref={mapRef} /> : <div className="branch-map-empty">تواصل معنا لمعرفة أقرب فرع كريم فارما.</div>; }
function Branches() { return <section className="page wrap"><SectionTitle eyebrow="خدمة الصيدليات" title="فروع كريم فارما" text="تواصل مع فريقنا لمعرفة تفاصيل أقرب فرع." /><BranchMap /><div className="branches-grid">{branches.map((branch) => <article className="branch-card" key={branch.id}><h3>{branch.name}</h3><strong>{branch.governorate}</strong><p>{branch.address || "تواصل معنا لمعرفة تفاصيل الفرع."}</p>{branch.googleMapsUrl && <a href={branch.googleMapsUrl} target="_blank" rel="noreferrer">افتح على الخريطة</a>}</article>)}</div></section>; }

function Rules() { return <section className="page wrap"><SectionTitle eyebrow="دوري الصيدليات" title="جوائز الحملة ونظام النقاط" text="كل نشاط لصيدليتك يقربك من جائزة جديدة." /><EarnPoints /><div className="prize-zone-grid">{[["أفضل 5 صيدليات", "بوكس التشجيع أو بوكس كريم فارما بضاعة مجانية أو خصم خاص على المسحوبات."], ["سحب التطبيق", "كل صيدلية تحقق 10 طلبات من التطبيق تدخل السحب الكبير. عدد الفائزين قد يصل إلى 50 فائز."], ["مباريات مصر", "سحوبات خاصة على توقعات مباريات منتخب مصر."], ["المباريات الجماهيرية", "سحوبات ومفاجآت إضافية في المباريات الكبرى."]].map(([title, text]) => <article className="prize-card" key={title}><h2>{title}</h2><p>{text}</p></article>)}</div><div className="rules-card">{["توقع واحد لكل صيدلية ورقم واتساب لكل مباراة.", "يمكن تعديل التوقع قبل بداية المباراة بدون نقاط إضافية.", "لفة واحدة يوميًا لكل صيدلية.", "الجوائز تخضع للتوافر وشروط الحملة."].map((rule, index) => <p key={rule}><b>{index + 1}</b>{rule}</p>)}</div></section>; }

function AdminDemo() {
  const adminPassword = import.meta.env?.VITE_ADMIN_PASSWORD?.trim(); const [authorized, setAuthorized] = useState(false); const [password, setPassword] = useState("");
  const [predictions, setPredictions] = useState(getPredictions); const [spins, setSpins] = useState(getSpins); const [results, setResults] = useState(getMatchResults); const [resultForm, setResultForm] = useState({ id: "1", scoreA: "", scoreB: "", status: "finished" });
  const [tables, setTables] = useState(null); const [loadingTables, setLoadingTables] = useState(isSupabaseConfigured);
  const [manual, setManual] = useState({ pharmacyId: "", points: "", reason: "", orderCount: "" });
  const downloadCsv = (rows, name, fields = Object.keys(rows[0] || {})) => { if (!rows.length) return; const csv = [fields, ...rows.map((row) => fields.map((field) => `"${String(row[field] ?? "").replaceAll('"', '""')}"`))].map((row) => row.join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" })); link.download = name; link.click(); URL.revokeObjectURL(link.href); };
  const predictionFields = ["pharmacyName", "contactName", "whatsapp", "governorate", "customerCode", "isCurrentCustomer", "onlineOrderingInterest", "currentOrderingMethod", "wantsContact", "favoriteTeams", "matchId", "prediction", "createdAt", "updatedAt"];
  const saveResult = async (event) => { event.preventDefault(); const result = { ...resultForm, scoreA: Number(resultForm.scoreA), scoreB: Number(resultForm.scoreB) }; saveMatchResult(result); await scoreMatchPredictions(result); setResults(getMatchResults()); reloadTables(); };
  const clear = () => { if (window.confirm("مسح كل البيانات التجريبية؟")) { clearDemoData(); setPredictions([]); setSpins([]); setResults([]); } };
  const reloadTables = () => loadAdminTables().then(setTables).catch((error) => console.error("[Admin tables]", error)).finally(() => setLoadingTables(false));
  useEffect(() => { if (isSupabaseConfigured && authorized) reloadTables(); }, [authorized]);
  const tableNames = ["pharmacies", "predictions", "wheel_spins", "leads_events", "points_ledger", "app_orders_progress", "draw_entries"];
  const localProfile = getProfile();
  const localTables = {
    pharmacies: localProfile ? [{ id: `local:${localProfile.whatsapp}`, pharmacy_name: localProfile.pharmacyName, contact_name: localProfile.contactName, whatsapp: localProfile.whatsapp, governorate: localProfile.governorate }] : [],
    predictions,
    wheel_spins: spins,
    leads_events: getLeadEvents(),
    points_ledger: getPointsLedger(),
    app_orders_progress: getAppOrdersProgress(),
    draw_entries: getDrawEntries()
  };
  const visibleTables = isSupabaseConfigured ? (tables || {}) : localTables;
  const pharmacyOptions = isSupabaseConfigured
    ? (tables?.pharmacies || []).map((row) => [row.id, row.pharmacy_name])
    : localTables.pharmacies.map((row) => [row.id, row.pharmacy_name]);
  const saveManualPoints = async (event) => { event.preventDefault(); await addManualPoints(manual.pharmacyId, manual.points, manual.reason); setManual({ ...manual, points: "", reason: "" }); reloadTables(); };
  const saveOrders = async (event) => { event.preventDefault(); await updateAppOrdersProgress(manual.pharmacyId, manual.orderCount); setManual({ ...manual, orderCount: "" }); reloadTables(); };
  const qualifyGrandDraw = async () => { if (!manual.pharmacyId) return; await markGrandDrawQualified(manual.pharmacyId); reloadTables(); };
  if (!adminPassword) return <section className="page narrow wrap admin-page"><SectionTitle eyebrow="لوحة محمية" title="إدارة الحملة غير متاحة" text="أضف كلمة مرور الإدارة في إعدادات النشر أولًا." /></section>;
  if (!authorized) return <section className="page narrow wrap admin-page"><SectionTitle eyebrow="لوحة محمية" title="دخول إدارة الحملة" /><form className="admin-login" onSubmit={(event) => { event.preventDefault(); if (password === adminPassword) setAuthorized(true); }}><input required type="password" placeholder="كلمة المرور" value={password} onChange={(event) => setPassword(event.target.value)} /><button className="btn primary">دخول</button></form></section>;
  return <section className="page wrap admin-page">
    <div className="admin-note">{isSupabaseConfigured ? "Supabase متصل بالإعدادات الحالية" : "وضع محلي احتياطي - متغيرات Supabase غير متاحة"}</div>
    <SectionTitle eyebrow="لوحة المتابعة" title="بيانات الحملة" text={loadingTables ? "جاري تحميل بيانات Supabase..." : "متابعة التسجيلات والتوقعات ولفات العجلة."} />
    <div className="admin-stats">{tableNames.map((name) => <article key={name}><b>{visibleTables?.[name]?.length ?? 0}</b><span>{name}</span></article>)}</div>
    <div className="admin-actions">{tableNames.map((name) => <button key={name} onClick={() => downloadCsv(visibleTables?.[name] || [], `${name}.csv`)}>تصدير {name} CSV</button>)}{!isSupabaseConfigured && <button className="danger" onClick={clear}>مسح البيانات المحلية</button>}</div>
    <div className="admin-table-grid">{tableNames.map((name) => <article key={name}><h3>{name}</h3><pre>{JSON.stringify((visibleTables?.[name] || []).slice(0, 10), null, 2)}</pre></article>)}</div>
    <div className="admin-manual-grid"><form onSubmit={saveManualPoints}><h3>إضافة نقاط يدوية</h3><select required value={manual.pharmacyId} onChange={(event) => setManual({ ...manual, pharmacyId: event.target.value })}><option value="">اختار الصيدلية</option>{pharmacyOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><input required type="number" value={manual.points} onChange={(event) => setManual({ ...manual, points: event.target.value })} placeholder="عدد النقاط" /><input required value={manual.reason} onChange={(event) => setManual({ ...manual, reason: event.target.value })} placeholder="السبب" /><button>إضافة النقاط</button></form><form onSubmit={saveOrders}><h3>تحديث طلبات التطبيق</h3><select required value={manual.pharmacyId} onChange={(event) => setManual({ ...manual, pharmacyId: event.target.value })}><option value="">اختار الصيدلية</option>{pharmacyOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><input required type="number" min="0" value={manual.orderCount} onChange={(event) => setManual({ ...manual, orderCount: event.target.value })} placeholder="عدد الطلبات" /><button>حفظ عدد الطلبات</button><button type="button" onClick={qualifyGrandDraw}>تأهيل لسحب 10 طلبات</button></form></div>
    <form className="admin-result-form" onSubmit={saveResult}><h3>تحديث نتيجة محلية</h3><select value={resultForm.id} onChange={(e) => setResultForm({ ...resultForm, id: e.target.value })}>{matchesData.map((match) => <option key={match.id} value={match.id}>#{match.id} {match.teamA} - {match.teamB}</option>)}</select><input required type="number" min="0" value={resultForm.scoreA} onChange={(e) => setResultForm({ ...resultForm, scoreA: e.target.value })} placeholder="نتيجة الفريق الأول" /><input required type="number" min="0" value={resultForm.scoreB} onChange={(e) => setResultForm({ ...resultForm, scoreB: e.target.value })} placeholder="نتيجة الفريق الثاني" /><button>حفظ النتيجة</button></form>
  </section>;
}
function NotFound() { return <section className="page narrow wrap"><EmptyCard text="الصفحة مش موجودة." /><Link className="btn primary back-link" to="/">ارجع للرئيسية</Link></section>; }
export default App;
