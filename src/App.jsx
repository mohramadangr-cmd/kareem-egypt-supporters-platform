import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import matchesData from "./data/matches.json";
import offers from "./data/offers.json";
import { campaign } from "./config/campaign";
import {
  clearDemoData,
  getMatchResults,
  getPredictions,
  getSpins,
  saveMatchResult,
  savePrediction,
  saveSpin
} from "./services/storage";

const { assetPaths } = campaign;
const governorates = ["القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "الغربية", "المنوفية", "القليوبية", "البحيرة", "الفيوم", "المنيا", "أسيوط", "سوهاج", "قنا", "أسوان", "أخرى"];
const wheelPrizes = ["تيشيرت منتخب مصر", "كاب تشجيع", "كرة صغيرة تذكارية", "ميدالية تذكارية", "نقاط إضافية", "هدية مفاجأة من كريم فارما", "حظ أوفر"];
const supporters = [
  ["أحمد علي", "صيدلية النور", "القاهرة", "صيدلية", 86],
  ["مريم حسن", "مخزن الشفاء", "الدقهلية", "مخزن أدوية أو شركة توزيع", 79],
  ["محمد كريم", "صيدلية الحياة", "الجيزة", "صيدلية", 73],
  ["سارة محمود", "شركة الأمل", "الشرقية", "مخزن أدوية أو شركة توزيع", 68],
  ["عمر ياسر", "مركز المدينة", "الإسكندرية", "مجالات أخرى", 61]
];

const navItems = [
  ["/", "⌂", "الرئيسية"],
  ["/matches", "⚽", "المباريات"],
  ["/leaderboard", "🏆", "لوحة الشرف"],
  ["/wheel", "✦", "عجلة الحظ"],
  ["/offers", "٪", "العروض"],
  ["/rules", "☰", "القواعد"]
];

const getDate = (match) => new Date(`${match.date}T${match.timeUTC}:00Z`);
const cairoDate = (match, options = {}) => new Intl.DateTimeFormat("ar-EG", {
  timeZone: "Africa/Cairo",
  month: "short",
  day: "numeric",
  ...options
}).format(getDate(match));
const cairoTime = (match) => new Intl.DateTimeFormat("ar-EG", {
  timeZone: "Africa/Cairo",
  hour: "numeric",
  minute: "2-digit"
}).format(getDate(match));
const isStarted = (match) => getDate(match) <= new Date();
const getMatches = () => {
  const results = getMatchResults();
  return matchesData.map((match) => ({ ...match, ...results.find((row) => row.id === match.id) }));
};
const todayCairo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());

function App() {
  return (
    <div className="app-shell">
      <div className="stadium-lights" />
      <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetails />} />
          <Route path="/predict/:id" element={<Prediction />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/wheel" element={<Wheel />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/admin-demo" element={<AdminDemo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand"><img src={assetPaths.logo} alt="كريم فارما" /></Link>
      <nav className="desktop-nav">
        {navItems.map(([to, , label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
      </nav>
      <Link className="header-cta" to="/matches">توقع الآن</Link>
    </header>
  );
}

function BottomNav() {
  const nextEgypt = matchesData.find((match) => match.teamA === "مصر" || match.teamB === "مصر") || matchesData[0];
  const items = [
    ["/", "⌂", "الرئيسية"],
    ["/matches", "⚽", "المباريات"],
    [`/predict/${nextEgypt.id}`, "★", "توقع"],
    ["/wheel", "✦", "العجلة"],
    ["/offers", "٪", "العروض"]
  ];
  return <nav className="bottom-nav">{items.map(([to, icon, label]) => <NavLink key={to} to={to}><b>{icon}</b><span>{label}</span></NavLink>)}</nav>;
}

function Footer() {
  return (
    <footer>
      <img src={assetPaths.logo} alt="كريم فارما" />
      <p>كريم فارما بتشجع منتخب مصر في كأس العالم ⚽</p>
      <small>شارك أصحابك المنافسة وعيش أجواء البطولة</small>
    </footer>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return <div className="section-title"><span>{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}

function Home() {
  const egyptMatches = matchesData.filter((match) => match.teamA === "مصر" || match.teamB === "مصر");
  const nextEgypt = egyptMatches.find((match) => !isStarted(match)) || egyptMatches[0];
  return (
    <>
      <section className="hero wrap">
        <div className="hero-copy">
          <img className="hero-logo" src={assetPaths.logo} alt="كريم فارما" />
          <span className="pill">🇪🇬 كريم فارما بتشجع منتخب مصر</span>
          <h1><em>شجع بلدك</em><br />وخليك في قلب الماتش</h1>
          <p>توقع النتيجة وادخل السحب على <strong>بوكس التشجيع من كريم فارما</strong></p>
          <div className="actions">
            <Link className="btn primary" to={`/predict/${nextEgypt.id}`}>توقع واكسب <b>←</b></Link>
            <Link className="btn ghost" to="/matches">شوف جدول المباريات</Link>
          </div>
        </div>
        <div className="hero-visual">
          <img className="flag-backdrop" src={assetPaths.egyptFlag} alt="" />
          <span className="float-ball">⚽</span>
          <img className="cheer-box hero-box" src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" />
          <div className="prize-sticker">اكسب<br /><strong>البوكس</strong></div>
        </div>
      </section>
      <Ticker />
      <section className="wrap home-grid">
        <Countdown match={nextEgypt} />
        <div className="stats-grid">
          {[["١٠٤", "مباريات البطولة"], ["٢,٤٨٠", "المشاركين"], ["٥,٩٢٠", "توقعات مسجلة"], ["🎁", "بوكس التشجيع"]].map(([value, label]) => <article className="stat-card" key={label}><strong>{value}</strong><span>{label}</span></article>)}
        </div>
      </section>
      <section className="wrap section-space">
        <SectionTitle eyebrow="عيش البطولة" title="التشجيع عندنا له طعم تاني" text="اختار اللي تحبه وابدأ المشاركة في ثواني." />
        <div className="quick-grid">
          <QuickCard icon="🇪🇬" title="مباراة مصر القادمة" text={`${nextEgypt.teamA} ضد ${nextEgypt.teamB}`} link={`/predict/${nextEgypt.id}`} action="توقع النتيجة" />
          <QuickCard icon="✦" title="عجلة الحظ اليومية" text="لفة جديدة كل يوم ومفاجآت مستنياك" link="/wheel" action="لف العجلة" />
          <QuickCard icon="٪" title="عروض البطولة" text="عروض ومتابعة نواقص من كريم فارما" link="/offers" action="شوف العروض" />
        </div>
      </section>
      <section className="prize-banner wrap">
        <img src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" />
        <div><span>جاهز للتشجيع؟</span><h2>اكسب بوكس التشجيع</h2><p>تيشيرت منتخب مصر + كاب تشجيع + هدايا ومفاجآت مجانية.</p><Link className="btn primary" to="/rules">اعرف تفاصيل الجائزة</Link></div>
      </section>
    </>
  );
}

function Ticker() {
  return <div className="ticker"><div>{Array.from({ length: 4 }, (_, i) => <span key={i}>⚽ سجل توقعك الآن وادخل السحب على بوكس التشجيع من كريم فارما</span>)}</div></div>;
}

function Countdown({ match }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const tick = () => {
      const delta = Math.max(0, getDate(match) - new Date());
      const days = Math.floor(delta / 86400000);
      const hours = Math.floor((delta / 3600000) % 24);
      const minutes = Math.floor((delta / 60000) % 60);
      setRemaining(`${days} يوم : ${hours} ساعة : ${minutes} دقيقة`);
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [match]);
  return <article className="countdown-card"><div><span>مباراة مصر القادمة</span><h3>{match.teamAFlagEmoji} {match.teamA} <b>VS</b> {match.teamB} {match.teamBFlagEmoji}</h3></div><div className="countdown"><small>باقي على الماتش</small><strong>{remaining}</strong></div></article>;
}

function QuickCard({ icon, title, text, link, action }) {
  return <article className="quick-card"><b className="quick-icon">{icon}</b><h3>{title}</h3><p>{text}</p><Link to={link}>{action} ←</Link></article>;
}

function Matches() {
  const [matches] = useState(getMatches);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [stage, setStage] = useState("all");
  const filtered = useMemo(() => matches.filter((match) => {
    const searchMatch = `${match.teamA} ${match.teamB}`.includes(query.trim());
    const filterMatch = filter === "all" ||
      (filter === "egypt" && (match.teamA === "مصر" || match.teamB === "مصر")) ||
      (filter === "today" && match.date === todayCairo()) ||
      (filter === "upcoming" && match.status === "upcoming") ||
      (filter === "finished" && match.status === "finished");
    return searchMatch && filterMatch && (stage === "all" || match.stage === stage);
  }), [matches, query, filter, stage]);
  return (
    <section className="page wrap">
      <SectionTitle eyebrow="كل الماتشات" title="جدول مباريات البطولة" text="اختار الماتش وسجل توقعك بسهولة." />
      <div className="filter-panel">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="دور على منتخب..." />
        <select value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="all">كل الأدوار</option>
          {[...new Set(matches.map((match) => match.stage))].map((value) => <option key={value}>{value}</option>)}
        </select>
        <div className="filter-chips">
          {[["all", "الكل"], ["egypt", "🇪🇬 مصر"], ["today", "اليوم"], ["upcoming", "القادمة"], ["finished", "انتهت"]].map(([value, label]) => <button className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}
        </div>
      </div>
      <div className="matches-grid">{filtered.map((match) => <MatchCard match={match} key={match.id} />)}</div>
      {!filtered.length && <div className="empty-card">مفيش مباريات مطابقة للبحث.</div>}
    </section>
  );
}

function MatchCard({ match, noAction = false }) {
  return (
    <article className={`match-card ${match.teamA === "مصر" || match.teamB === "مصر" ? "egypt-match" : ""}`}>
      <div className="match-meta"><span>{match.stage}{match.group && ` • ${match.group}`}</span><StatusBadge status={match.status} /></div>
      <div className="teams">
        <div><b>{match.teamAFlagEmoji}</b><strong>{match.teamA}</strong></div>
        <span>{match.status === "finished" ? `${match.scoreA} - ${match.scoreB}` : "VS"}</span>
        <div><b>{match.teamBFlagEmoji}</b><strong>{match.teamB}</strong></div>
      </div>
      <div className="match-bottom"><small>{cairoDate(match)} • {cairoTime(match)} • {match.venue}</small>{!noAction && <Link to={`/predict/${match.id}`}>توقع الماتش</Link>}</div>
    </article>
  );
}

function StatusBadge({ status }) {
  const labels = { upcoming: "قريبًا", live: "مباشر", finished: "انتهت" };
  return <i className={`status ${status}`}>{labels[status]}</i>;
}

function MatchDetails() {
  const { id } = useParams();
  const match = getMatches().find((row) => row.id === id);
  if (!match) return <NotFound />;
  return <section className="page narrow wrap"><SectionTitle eyebrow="تفاصيل الماتش" title="جاهز تسجل توقعك؟" /><MatchCard match={match} noAction /><div className="center-action"><Link className="btn primary" to={`/predict/${id}`}>سجل توقعك دلوقتي</Link></div></section>;
}

function Prediction() {
  const { id } = useParams();
  const match = getMatches().find((row) => row.id === id);
  const navigate = useNavigate();
  const keyBase = (whatsapp) => `${whatsapp.replace(/\D/g, "")}_${id}`;
  const [success, setSuccess] = useState(false);
  const [locked, setLocked] = useState(false);
  const [form, setForm] = useState({ name: "", whatsapp: "", governorate: "", category: "", workplace: "", onlineOrder: "", favoriteTeams: "", scoreA: "", scoreB: "", consent: false });
  if (!match) return <NotFound />;
  const handleWhatsapp = (value) => {
    const existing = getPredictions().find((row) => row.key === keyBase(value));
    setForm(existing ? { ...existing } : { ...form, whatsapp: value });
    setLocked(Boolean(existing && isStarted(match)));
  };
  const submit = (event) => {
    event.preventDefault();
    if (locked || isStarted(match)) return setLocked(true);
    savePrediction({ ...form, key: keyBase(form.whatsapp), matchId: id, createdAt: new Date().toISOString() });
    setSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  if (success) return <section className="page narrow wrap"><div className="success-card"><b>✓</b><h1>تم تسجيل توقعك بنجاح</h1><p>بالتوفيق في السحب على بوكس التشجيع من كريم فارما</p><Link className="btn primary" to="/matches">توقع ماتش تاني</Link><button onClick={() => navigate("/wheel")} className="btn ghost">لف عجلة الحظ</button></div></section>;
  return (
    <section className="page narrow wrap">
      <SectionTitle eyebrow="توقع واكسب" title="إيه توقعك للماتش؟" text="سجل بياناتك وتوقع النتيجة قبل صفارة البداية." />
      <MatchCard match={match} noAction />
      {locked && <div className="notice">🔒 التوقع ده اتقفل مع بداية المباراة.</div>}
      <form className="prediction-form" onSubmit={submit}>
        <div className="field"><label>الاسم</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اكتب اسمك بالكامل" /></div>
        <div className="field"><label>رقم واتساب</label><input required inputMode="tel" value={form.whatsapp} onChange={(e) => handleWhatsapp(e.target.value)} placeholder="01xxxxxxxxx" /></div>
        <div className="form-row">
          <div className="field"><label>المحافظة</label><select required value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })}><option value="">اختار المحافظة</option>{governorates.map((value) => <option key={value}>{value}</option>)}</select></div>
          <div className="field"><label>التصنيف</label><select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">اختار التصنيف</option>{campaign.categories.map((value) => <option key={value}>{value}</option>)}</select></div>
        </div>
        <div className="field"><label>اسم الصيدلية / المكان / الشركة</label><input required value={form.workplace} onChange={(e) => setForm({ ...form, workplace: e.target.value })} placeholder="اكتب اسم مكان العمل" /></div>
        <div className="field"><label>مهتم بالطلب أونلاين من كريم فارما؟</label><div className="radio-grid">{campaign.onlineOrderOptions.map((value) => <label key={value}><input required type="radio" name="online" checked={form.onlineOrder === value} onChange={() => setForm({ ...form, onlineOrder: value })} />{value}</label>)}</div></div>
        <div className="field"><label>الفرق اللي بتشجعها</label><input value={form.favoriteTeams} onChange={(e) => setForm({ ...form, favoriteTeams: e.target.value })} placeholder="مثال: مصر والبرازيل" /></div>
        <div className="score-box">
          <h3>توقع النتيجة</h3>
          <div><label><b>{match.teamAFlagEmoji}</b><span>{match.teamA}</span><input required type="number" min="0" max="20" value={form.scoreA} onChange={(e) => setForm({ ...form, scoreA: e.target.value })} /></label><em>-</em><label><b>{match.teamBFlagEmoji}</b><span>{match.teamB}</span><input required type="number" min="0" max="20" value={form.scoreB} onChange={(e) => setForm({ ...form, scoreB: e.target.value })} /></label></div>
        </div>
        <label className="consent"><input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /> أوافق على استقبال تنبيهات المباريات والعروض من كريم فارما</label>
        <button className="btn primary submit" disabled={locked}>ثبت توقعك وادخل السحب</button>
      </form>
    </section>
  );
}

function Leaderboard() {
  const [tab, setTab] = useState("الكل");
  const tabs = ["الكل", ...campaign.categories, "المحافظات"];
  const list = supporters.filter((row) => tab === "الكل" || tab === "المحافظات" || row[3] === tab);
  return (
    <section className="page wrap">
      <SectionTitle eyebrow="أبطال التشجيع" title="لوحة الشرف" text="توقع صح واجمع نقاط واطلع في الترتيب." />
      <div className="score-rules"><span>النتيجة بالضبط <b>+١٠</b></span><span>الفائز صح <b>+٥</b></span><span>فارق الأهداف <b>+٣</b></span></div>
      <div className="tabs">{tabs.map((value) => <button className={tab === value ? "active" : ""} onClick={() => setTab(value)} key={value}>{value}</button>)}</div>
      <div className="leader-grid">
        <div className="leader-card">
          <h3>🏆 أقوى المشجعين</h3>
          {list.map(([name, workplace, governorate, , points], index) => <div className="rank-row" key={name}><b className={`rank rank-${index}`}>{index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}</b><div><strong>{name}</strong><small>{workplace} • {governorate}</small></div><em>{points} نقطة</em></div>)}
        </div>
        <div className="mini-leaders">
          <article><h3>⭐ أماكن في الصدارة</h3><p><b>١</b> صيدلية النور <em>١٩٢ نقطة</em></p><p><b>٢</b> مخزن الشفاء <em>١٧٥ نقطة</em></p><p><b>٣</b> صيدلية الحياة <em>١٥٨ نقطة</em></p></article>
          <article><h3>📍 محافظات متحمسة</h3><p><b>١</b> القاهرة <em>٨٤٠ نقطة</em></p><p><b>٢</b> الدقهلية <em>٧٩٢ نقطة</em></p><p><b>٣</b> الشرقية <em>٧٣٥ نقطة</em></p></article>
        </div>
      </div>
    </section>
  );
}

function Wheel() {
  const [whatsapp, setWhatsapp] = useState("");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState("");
  const spin = () => {
    if (!whatsapp.trim() || spinning) return;
    const digits = whatsapp.replace(/\D/g, "");
    const date = todayCairo();
    if (getSpins().some((row) => row.whatsapp === digits && row.date === date)) return setResult("خدت لفتك النهارده، ارجع لنا بكرة لمفاجأة جديدة.");
    const prizeIndex = Math.floor(Math.random() * wheelPrizes.length);
    setSpinning(true);
    setResult("");
    setRotation((value) => value + 1440 + prizeIndex * (360 / wheelPrizes.length));
    setTimeout(() => {
      const prize = wheelPrizes[prizeIndex];
      saveSpin({ whatsapp: digits, date, prize, createdAt: new Date().toISOString() });
      setResult(`نتيجتك: ${prize}`);
      setSpinning(false);
    }, 3700);
  };
  return (
    <section className="page wrap wheel-layout">
      <div>
        <SectionTitle eyebrow="مفاجآت كل يوم" title="لف العجلة وعيش التشجيع مع كريم فارما" text="ادخل رقم واتساب وخد لفتك اليومية." />
        <div className="wheel-form"><input inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="رقم واتساب" /><button className="btn primary" onClick={spin} disabled={spinning}>{spinning ? "العجلة بتلف..." : "لف العجلة"}</button></div>
        {result && <div className="wheel-result">{result}</div>}
        <small className="availability">الجوائز تخضع لشروط الحملة والتوافر.</small>
      </div>
      <div className="wheel-stage">
        <div className="wheel-pointer">▼</div>
        <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
          {wheelPrizes.map((prize, index) => <span style={{ transform: `rotate(${index * (360 / wheelPrizes.length)}deg)` }} key={prize}>{prize}</span>)}
        </div>
        <img src={assetPaths.logo} alt="كريم فارما" />
      </div>
      <img className="wheel-box" src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" />
    </section>
  );
}

function Offers() {
  const sections = [...new Set(offers.map((offer) => offer.section))];
  const whatsappLink = (offer) => `https://wa.me/${campaign.whatsappNumber}?text=${encodeURIComponent(`السلام عليكم، أرغب في الاستفادة من ${offer.title} من كريم فارما.`)}`;
  return (
    <section className="page wrap">
      <SectionTitle eyebrow="فرص تستاهل" title="عروض البطولة" text="اختار العرض وتواصل مع فريق كريم فارما على واتساب." />
      {sections.map((section) => <div className="offers-section" key={section}><h3>{section}</h3><div className="offers-grid">{offers.filter((offer) => offer.section === section).map((offer) => <article className="offer-card" key={offer.id}><img src={assetPaths.logo} alt="كريم فارما" /><span>{offer.validUntil}</span><h4>{offer.title}</h4><p>{offer.description}</p><a target="_blank" rel="noreferrer" href={whatsappLink(offer)}>اطلب العرض على واتساب</a></article>)}</div></div>)}
    </section>
  );
}

function Rules() {
  const rules = ["توقع واحد لكل رقم واتساب لكل مباراة", "يمكن تعديل التوقع قبل بداية المباراة", "يتم غلق التوقع مع بداية المباراة", "الفائزون يتم التواصل معهم عبر واتساب", "التصنيفات منفصلة: صيدلية / مخزن أدوية أو شركة توزيع / مجالات أخرى", "الجوائز تخضع للتوافر وشروط الحملة"];
  return (
    <section className="page wrap rules-layout">
      <div><SectionTitle eyebrow="كل اللي محتاج تعرفه" title="الجائزة وقواعد المشاركة" text="خطوات بسيطة وفرصة حلوة تعيش بيها أجواء البطولة." /><div className="rules-card">{rules.map((rule, index) => <p key={rule}><b>{index + 1}</b>{rule}</p>)}</div></div>
      <article className="prize-card"><img src={assetPaths.logo} alt="كريم فارما" /><img src={assetPaths.cheerBox} alt="بوكس التشجيع من كريم فارما" /><span>الجائزة</span><h2>بوكس التشجيع من كريم فارما</h2><p>تيشيرت منتخب مصر + كاب تشجيع + هدايا ومفاجآت مجانية.</p><Link className="btn primary" to="/matches">اختار ماتش وتوقع</Link></article>
    </section>
  );
}

function AdminDemo() {
  const [predictions, setPredictions] = useState(getPredictions);
  const [spins, setSpins] = useState(getSpins);
  const [results, setResults] = useState(getMatchResults);
  const [resultForm, setResultForm] = useState({ id: "1", scoreA: "", scoreB: "", status: "finished" });
  const downloadCsv = (rows, name) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys, ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`))].map((row) => row.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const saveResult = (event) => {
    event.preventDefault();
    const row = { ...resultForm, scoreA: Number(resultForm.scoreA), scoreB: Number(resultForm.scoreB) };
    saveMatchResult(row);
    setResults(getMatchResults());
  };
  const clear = () => {
    if (!window.confirm("مسح كل البيانات التجريبية؟")) return;
    clearDemoData();
    setPredictions([]);
    setSpins([]);
    setResults([]);
  };
  return (
    <section className="page wrap admin-page">
      <div className="admin-note">وضع تجريبي محلي - سيتم استبداله لاحقًا بقاعدة بيانات Supabase</div>
      <SectionTitle eyebrow="إدارة العرض التجريبي" title="لوحة المتابعة المحلية" />
      <div className="admin-stats"><article><b>{predictions.length}</b><span>توقعات</span></article><article><b>{spins.length}</b><span>لفات عجلة</span></article><article><b>{results.length}</b><span>نتائج محدثة</span></article></div>
      <div className="admin-actions"><button onClick={() => downloadCsv(predictions, "predictions.csv")}>تصدير التوقعات CSV</button><button onClick={() => downloadCsv(spins, "wheel-spins.csv")}>تصدير اللفات CSV</button><button className="danger" onClick={clear}>مسح البيانات التجريبية</button></div>
      <form className="admin-result-form" onSubmit={saveResult}><h3>إضافة أو تعديل نتيجة محلية</h3><select value={resultForm.id} onChange={(e) => setResultForm({ ...resultForm, id: e.target.value })}>{matchesData.map((match) => <option value={match.id} key={match.id}>#{match.id} {match.teamA} - {match.teamB}</option>)}</select><input required type="number" min="0" value={resultForm.scoreA} onChange={(e) => setResultForm({ ...resultForm, scoreA: e.target.value })} placeholder="نتيجة الفريق الأول" /><input required type="number" min="0" value={resultForm.scoreB} onChange={(e) => setResultForm({ ...resultForm, scoreB: e.target.value })} placeholder="نتيجة الفريق الثاني" /><button>حفظ النتيجة</button></form>
      <div className="admin-list"><h3>آخر التوقعات</h3>{predictions.slice(-8).reverse().map((row) => <p key={row.key}><b>{row.name}</b><span>{row.whatsapp}</span><em>ماتش #{row.matchId}: {row.scoreA} - {row.scoreB}</em></p>)}{!predictions.length && <small>لا توجد توقعات محفوظة حتى الآن.</small>}</div>
    </section>
  );
}

function NotFound() {
  return <section className="page narrow wrap"><div className="empty-card"><h1>الصفحة مش موجودة</h1><Link className="btn primary" to="/">ارجع للرئيسية</Link></div></section>;
}

export default App;
