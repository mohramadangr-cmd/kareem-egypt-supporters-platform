import React, { useMemo, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import {
  loyaltyGovernorates,
  loyaltyLevels,
  sampleBranches,
  sampleLedger,
  samplePharmacies,
  sampleRedemptions
} from "../loyaltyPreview/mockData";
import { getLoyaltyOffers, saveLoyaltyRegistrationRequest } from "../loyaltyPreview/storage";

const whatsappNumber = "01145000445";
const whatsappText = "السلام عليكم، أرغب في الاستفادة من برنامج كريم فارما للمكافآت.";
const whatsappUrl = `https://wa.me/2${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`;

const desktopNav = [
  { to: "/", label: "الرئيسية" },
  { to: "/my-points", label: "نقاطي" },
  { to: "/offers", label: "العروض" },
  { to: "/register", label: "التسجيل" },
  { to: "/how-it-works", label: "كيف يعمل" },
  { to: "/about", label: "عن كريم فارما" }
];

const mobileNav = [
  { to: "/", label: "الرئيسية", icon: "⌂" },
  { to: "/my-points", label: "نقاطي", icon: "●", featured: true },
  { to: "/offers", label: "العروض", icon: "٪" },
  { to: "/register", label: "التسجيل", icon: "+" },
  { to: "/more", label: "المزيد", icon: "⋯" }
];

const homeValueCards = [
  { title: "نقاط ترحيبية", text: "ابدأ برصيد افتتاحي بعد التسجيل والتفعيل." },
  { title: "نقاط على الطلبات", text: "كل طلب أونلاين يضيف إلى رصيد صيدليتك." },
  { title: "عروض حصرية", text: "عروض قصيرة وواضحة مرتبطة بالنقاط." },
  { title: "تفعيل التطبيق", text: "خطوة أساسية لفتح المزايا والمتابعة." }
];

const homeSteps = [
  { step: "1", title: "سجل", text: "بيانات الصيدلية والمسؤول." },
  { step: "2", title: "فعّل التطبيق", text: "استلم بيانات الدخول وابدأ." },
  { step: "3", title: "اطلب واجمع نقاط", text: "تابع الرصيد والعروض من مكان واحد." }
];

const trustItems = [
  "شركة توزيع دوائي مصرية منذ 2005",
  "خدمة مخصصة للصيدليات",
  "برنامج موحد للنقاط والعروض"
];

const moreLinks = [
  { to: "/how-it-works", title: "دليل سريع", text: "كيف تبدأ وتجمع النقاط." },
  { to: "/about", title: "عن كريم فارما", text: "نبذة مختصرة وثقة العلامة." },
  { to: "/register", title: "تسجيل صيدلية", text: "ابدأ طلب التفعيل الآن." }
];

const formatDate = (value) =>
  new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));

const getCurrentLevel = (points) =>
  loyaltyLevels.find((level) => points >= level.min && points <= level.max) || loyaltyLevels[0];

const getNextLevelGap = (points) => {
  const nextLevel = loyaltyLevels.find((level) => points < level.min);
  return nextLevel ? nextLevel.min - points : 0;
};

const getCategoryTotals = (ledger) => ({
  welcome: ledger
    .filter((item) => item.type.includes("ترحيبية") || item.type.includes("التفعيل"))
    .reduce((sum, item) => sum + Math.max(item.points, 0), 0),
  orders: ledger
    .filter((item) => item.type.includes("طلب"))
    .reduce((sum, item) => sum + Math.max(item.points, 0), 0),
  offers: ledger
    .filter((item) => item.type.includes("عرض"))
    .reduce((sum, item) => sum + Math.max(item.points, 0), 0),
  campaigns: ledger
    .filter((item) => item.type.includes("حملات"))
    .reduce((sum, item) => sum + Math.max(item.points, 0), 0)
});

function RewardsPlatformApp() {
  const offers = useMemo(() => getLoyaltyOffers().filter((offer) => offer.active !== false), []);
  const pharmacy = samplePharmacies[0];
  const currentLevel = getCurrentLevel(pharmacy.pointsBalance);
  const nextLevelGap = getNextLevelGap(pharmacy.pointsBalance);
  const categoryTotals = getCategoryTotals(sampleLedger);
  const monthlyPoints = sampleLedger
    .filter((item) => item.points > 0 && item.date.startsWith("2026-06"))
    .reduce((sum, item) => sum + item.points, 0);

  const appState = {
    offers,
    pharmacy,
    currentLevel,
    nextLevelGap,
    categoryTotals,
    monthlyPoints,
    ledger: sampleLedger,
    redemptions: sampleRedemptions,
    branches: sampleBranches
  };

  return (
    <div className="rewards-shell">
      <div className="rewards-backdrop" />
      <header className="rewards-header">
        <Link className="rewards-brand" to="/">
          <img src="/assets/kareem-logo.png" alt="Kareem Pharma" />
          <div>
            <strong>برنامج كريم فارما للمكافآت</strong>
            <span>منصة الصيدليات للنقاط والعروض</span>
          </div>
        </Link>
        <nav className="rewards-desktop-nav">
          {desktopNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <a className="rewards-header-cta" href={whatsappUrl} target="_blank" rel="noreferrer">
          تواصل معنا
        </a>
      </header>

      <main className="rewards-main">
        <Routes>
          <Route index element={<HomePage state={appState} />} />
          <Route path="/my-points" element={<MyPointsPage state={appState} />} />
          <Route path="/offers" element={<OffersPage offers={offers} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/more" element={<MorePage branches={sampleBranches} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="rewards-footer">
        <div>
          <strong>كريم فارما</strong>
          <p>برنامج موحد لمتابعة الرصيد والعروض وتفعيل الطلبات الأونلاين للصيدليات.</p>
        </div>
        <div className="rewards-footer-links">
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            واتساب: 01145000445
          </a>
          <a href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">
            Facebook / KareemPharmaOfficial
          </a>
        </div>
      </footer>

      <nav className="rewards-mobile-nav" aria-label="التنقل السفلي">
        {mobileNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={item.featured ? "featured" : ""}>
            <b>{item.icon}</b>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function HomePage({ state }) {
  return (
    <div className="page-stack">
      <section className="hero-grid">
        <article className="hero-card">
          <span className="eyebrow">برنامج كريم فارما للمكافآت</span>
          <h1>اطلب أونلاين، اجمع نقاط، واستفد من مزايا حصرية لصيدليتك</h1>
          <p>واجهة أبسط لمتابعة الرصيد، العروض، والتفعيل من نفس المكان.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/register">
              سجل الآن
            </Link>
            <Link className="btn btn-secondary" to="/my-points">
              نقاطي
            </Link>
            <Link className="btn btn-ghost" to="/offers">
              العروض
            </Link>
          </div>
        </article>

        <article className="hero-balance-card">
          <span className="eyebrow">نقاطي</span>
          <strong>{state.pharmacy.pointsBalance}</strong>
          <p>رصيد حالي لصيدلية {state.pharmacy.pharmacyName}</p>
          <div className="balance-meta">
            <span>{state.currentLevel.name}</span>
            <span>{state.nextLevelGap ? `${state.nextLevelGap} نقطة للمستوى التالي` : "أعلى مستوى متاح"}</span>
          </div>
        </article>
      </section>

      <section className="section-stack">
        <div className="section-heading">
          <span>المزايا الأساسية</span>
          <h2>أربع مزايا واضحة فقط</h2>
        </div>
        <div className="compact-grid four">
          {homeValueCards.map((item) => (
            <article key={item.title} className="mini-card">
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-stack">
        <div className="section-heading">
          <span>كيف يعمل</span>
          <h2>ثلاث خطوات سريعة</h2>
        </div>
        <div className="compact-grid three">
          {homeSteps.map((item) => (
            <article key={item.step} className="step-card">
              <b>{item.step}</b>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-stack">
        <div className="section-heading inline">
          <div>
            <span>العروض الحالية</span>
            <h2>عروض مختصرة وواضحة</h2>
          </div>
          <Link className="section-link" to="/offers">
            عرض الكل
          </Link>
        </div>
        <div className="offers-grid">
          {state.offers.slice(0, 3).map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </section>

      <section className="section-stack trust-section">
        <div className="section-heading">
          <span>ثقة مختصرة</span>
          <h2>عن كريم فارما</h2>
        </div>
        <div className="compact-grid three">
          {trustItems.map((item) => (
            <article key={item} className="trust-card">
              {item}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MyPointsPage({ state }) {
  const [tab, setTab] = useState("summary");

  const summaryCards = [
    { label: "نقاط هذا الشهر", value: state.monthlyPoints },
    { label: "المستوى الحالي", value: state.currentLevel.name },
    { label: "المتبقي للمستوى التالي", value: state.nextLevelGap || "مكتمل" }
  ];

  const categoryCards = [
    { label: "نقاط ترحيبية", value: state.categoryTotals.welcome },
    { label: "نقاط الطلبات", value: state.categoryTotals.orders },
    { label: "نقاط العروض", value: state.categoryTotals.offers },
    { label: "نقاط الحملات", value: state.categoryTotals.campaigns }
  ];

  return (
    <div className="page-stack">
      <section className="profile-strip">
        <div>
          <span>اسم الصيدلية</span>
          <strong>{state.pharmacy.pharmacyName}</strong>
        </div>
        <div>
          <span>كود العميل</span>
          <strong>{state.pharmacy.customerCode}</strong>
        </div>
        <div>
          <span>المحافظة</span>
          <strong>{state.pharmacy.governorate}</strong>
        </div>
      </section>

      <section className="points-hero-card">
        <span className="eyebrow">رصيدك الحالي</span>
        <strong>{state.pharmacy.pointsBalance}</strong>
        <p>رصيد واضح ومحدث لاستخدامه في المتابعة والاستبدال.</p>
      </section>

      <section className="compact-grid three">
        {summaryCards.map((item) => (
          <article key={item.label} className="metric-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="section-stack">
        <div className="segmented-tabs" role="tablist" aria-label="تفاصيل النقاط">
          <button type="button" className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>
            ملخص
          </button>
          <button type="button" className={tab === "details" ? "active" : ""} onClick={() => setTab("details")}>
            التفاصيل
          </button>
          <button type="button" className={tab === "redemption" ? "active" : ""} onClick={() => setTab("redemption")}>
            الاستبدال
          </button>
        </div>

        {tab === "summary" && (
          <div className="compact-grid four">
            {categoryCards.map((item) => (
              <article key={item.label} className="mini-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        )}

        {tab === "details" && (
          <div className="ledger-list">
            <div className="ledger-item ledger-head">
              <span>النوع</span>
              <span>الوصف</span>
              <span>التاريخ</span>
              <span>النقاط</span>
            </div>
            {state.ledger.map((item) => (
              <div key={item.id} className="ledger-item">
                <span>{item.type}</span>
                <span>{item.description}</span>
                <span>{formatDate(item.date)}</span>
                <strong className={item.points < 0 ? "negative" : "positive"}>
                  {item.points > 0 ? `+${item.points}` : item.points}
                </strong>
              </div>
            ))}
          </div>
        )}

        {tab === "redemption" && (
          <div className="compact-grid three">
            {state.redemptions.map((item) => (
              <article key={item.id} className="redemption-card">
                <strong>{item.rewardGiven}</strong>
                <span>{item.pharmacy}</span>
                <p>{item.pointsUsed} نقطة</p>
                <small>{item.status}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OffersPage({ offers }) {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span>العروض</span>
        <h1>عروض تجارية مختصرة</h1>
      </section>
      <div className="offers-grid">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </div>
  );
}

function OfferCard({ offer }) {
  const link = `https://wa.me/2${whatsappNumber}?text=${encodeURIComponent(offer.whatsappCTA || whatsappText)}`;

  return (
    <article className="offer-card">
      <div className="offer-banner" style={{ background: offer.bannerImage }}>
        <span>{offer.offerType}</span>
        <strong>{offer.giftValue || `${offer.pointsReward} نقطة`}</strong>
      </div>
      <div className="offer-body">
        <h3>{offer.title}</h3>
        <p>{offer.shortDescription}</p>
        <div className="offer-meta">
          <small>{offer.terms}</small>
          <small>ينتهي {formatDate(offer.endDate)}</small>
        </div>
        <a className="btn btn-primary" href={link} target="_blank" rel="noreferrer">
          اطلب العرض
        </a>
      </div>
    </article>
  );
}

function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    pharmacyName: "",
    contactName: "",
    whatsapp: "",
    email: "",
    governorate: "",
    address: "",
    requestType: "عميل حالي",
    customerCode: ""
  });

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    saveLoyaltyRegistrationRequest({
      id: `req-${Date.now()}`,
      ...form,
      status: "جديد",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setSubmitted(true);
    setForm({
      pharmacyName: "",
      contactName: "",
      whatsapp: "",
      email: "",
      governorate: "",
      address: "",
      requestType: "عميل حالي",
      customerCode: ""
    });
  };

  return (
    <div className="page-stack narrow">
      <section className="section-heading">
        <span>التسجيل</span>
        <h1>ابدأ طلب التفعيل</h1>
        <p>نموذج قصير لتسجيل الصيدلية وربط الحساب.</p>
      </section>

      <section className="form-surface">
        {submitted ? (
          <div className="success-card">
            <strong>تم استلام الطلب</strong>
            <p>سيتم التواصل معك لاستكمال التفعيل وربط بيانات الصيدلية.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setSubmitted(false)}>
              طلب جديد
            </button>
          </div>
        ) : (
          <form className="register-form" onSubmit={handleSubmit}>
            <input required placeholder="اسم الصيدلية" value={form.pharmacyName} onChange={updateField("pharmacyName")} />
            <input required placeholder="اسم المسؤول" value={form.contactName} onChange={updateField("contactName")} />
            <input required placeholder="رقم واتساب" value={form.whatsapp} onChange={updateField("whatsapp")} />
            <input required type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={updateField("email")} />
            <select required value={form.governorate} onChange={updateField("governorate")}>
              <option value="">المحافظة</option>
              {loyaltyGovernorates.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input required placeholder="العنوان" value={form.address} onChange={updateField("address")} />
            <select value={form.requestType} onChange={updateField("requestType")}>
              <option value="عميل حالي">عميل حالي</option>
              <option value="تكويد جديد">تكويد جديد</option>
            </select>
            <input placeholder="كود العميل إن وجد" value={form.customerCode} onChange={updateField("customerCode")} />
            <button className="btn btn-primary full" type="submit">
              إرسال الطلب
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function HowItWorksPage() {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span>كيف يعمل</span>
        <h1>دليل بصري سريع</h1>
      </section>

      <div className="compact-grid four">
        {[
          "سجل صيدليتك",
          "فعّل التطبيق",
          "اطلب أونلاين",
          "استفد من العروض"
        ].map((item, index) => (
          <article key={item} className="guide-card">
            <b>{index + 1}</b>
            <strong>{item}</strong>
          </article>
        ))}
      </div>

      <section className="section-stack">
        <div className="section-heading">
          <span>المستويات</span>
          <h2>مستويات التعامل</h2>
        </div>
        <div className="compact-grid four">
          {loyaltyLevels.map((level) => (
            <article key={level.name} className="level-card">
              <strong>{level.name}</strong>
              <span>
                {level.min} - {Number.isFinite(level.max) ? level.max : "فأكثر"} نقطة
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span>عن كريم فارما</span>
        <h1>ثقة دوائية وخدمة للصيدليات</h1>
      </section>

      <section className="about-surface">
        <p>كريم فارما شركة مصرية متخصصة في توزيع الأدوية وتخدم الصيدليات عبر شبكة تشغيلية وخدمة موجهة للتعاملات اليومية.</p>
        <div className="compact-grid three">
          <article className="trust-card">تأسست عام 2005</article>
          <article className="trust-card">خدمة مهنية موجهة للصيدليات</article>
          <article className="trust-card">تركيز على التفعيل والطلب الأونلاين</article>
        </div>
      </section>
    </div>
  );
}

function MorePage({ branches }) {
  return (
    <div className="page-stack">
      <section className="section-heading">
        <span>المزيد</span>
        <h1>روابط سريعة وتواصل</h1>
      </section>

      <div className="compact-grid three">
        {moreLinks.map((item) => (
          <Link key={item.to} to={item.to} className="more-card">
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </Link>
        ))}
      </div>

      <section className="about-surface">
        <strong>فروع وخدمة</strong>
        <div className="branch-list">
          {branches.map((branch) => (
            <span key={branch}>{branch}</span>
          ))}
        </div>
        <a className="btn btn-primary" href={whatsappUrl} target="_blank" rel="noreferrer">
          تواصل عبر واتساب
        </a>
      </section>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="page-stack narrow">
      <section className="form-surface center">
        <strong>الصفحة غير متاحة</strong>
        <p>يمكنك العودة إلى الصفحة الرئيسية أو متابعة نقاطك من الأسفل.</p>
        <Link className="btn btn-primary" to="/">
          العودة للرئيسية
        </Link>
      </section>
    </div>
  );
}

export default RewardsPlatformApp;
