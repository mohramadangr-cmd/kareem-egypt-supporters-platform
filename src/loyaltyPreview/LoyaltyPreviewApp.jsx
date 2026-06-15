import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  loyaltyGovernorates,
  loyaltyLevels,
  sampleBranches,
  sampleLedger,
  sampleOffers,
  samplePharmacies,
  samplePointsRules,
  sampleRedemptions,
  sampleUploadPreview
} from "./mockData";
import {
  getLoyaltyOffers,
  getLoyaltyRegistrationRequests,
  saveLoyaltyOffers,
  saveLoyaltyRegistrationRequest,
  updateLoyaltyRegistrationStatus
} from "./storage";
import "../loyaltyPreview/loyalty-preview.css";

const whatsappNumber = "01145000445";
const whatsappMessage = "السلام عليكم، أرغب في الاستفادة من عروض برنامج كريم فارما للمكافآت.";
const whatsappUrl = `https://wa.me/2${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

const publicNav = [
  { to: "/preview-loyalty", label: "الرئيسية" },
  { to: "/preview-loyalty/how-it-works", label: "برنامج المكافآت" },
  { to: "/preview-loyalty/my-points", label: "نقاطي" },
  { to: "/preview-loyalty/offers", label: "العروض" },
  { to: "/preview-loyalty/register", label: "التسجيل" },
  { to: "/preview-loyalty/about", label: "عن كريم فارما" }
];

const summaryCards = [
  { label: "إجمالي النقاط", value: "2450" },
  { label: "الرصيد المتاح", value: "2450" },
  { label: "نقاط ترحيبية", value: "100" },
  { label: "نقاط الطلبات الأونلاين", value: "1500" },
  { label: "نقاط العروض", value: "600" },
  { label: "نقاط الحملات", value: "250" },
  { label: "نقاط مستبدلة", value: "0" }
];

const homeValueCards = [
  "نقاط ترحيبية عند التسجيل",
  "نقاط على الطلبات الأونلاين",
  "عروض مخصصة للصيدليات",
  "رصيد نقاط واضح ومفصل",
  "مزايا حسب مستوى التعامل"
];

const pointsPreviewCards = [
  "التسجيل في البرنامج = نقاط ترحيبية",
  "تفعيل حساب منصة كريم فارما الرقمية = نقاط إضافية",
  "أول طلب أونلاين = نقاط مميزة",
  "كل طلب أونلاين = نقاط مستمرة",
  "أصناف وعروض محددة = نقاط إضافية",
  "عروض شهرية = نقاط مضاعفة"
];

const rewardTypes = [
  "نقاط إضافية",
  "رصيد مكافآت",
  "خصم",
  "بضاعة مجانية",
  "نقاط مضاعفة",
  "عرض تسجيل",
  "عرض أول طلب",
  "عرض أصناف محددة",
  "عرض قيمة طلب"
];

const requestStatuses = ["جديد", "جاري المراجعة", "تم ربط كود العميل", "تم إرسال بيانات الدخول", "تم التفعيل", "غير مكتمل"];

const formatDate = (value) =>
  new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));

const getCurrentLevel = (points) => loyaltyLevels.find((level) => points >= level.min && points <= level.max) || loyaltyLevels[0];

const nextLevelGap = (points) => {
  const next = loyaltyLevels.find((level) => points < level.min);
  return next ? next.min - points : 0;
};

function LoyaltyPreviewApp() {
  const location = useLocation();

  if (location.pathname === "/preview-loyalty/admin") {
    return <AdminPage />;
  }

  return (
    <div className="loyalty-shell">
      <header className="loyalty-header">
        <Link className="loyalty-brand" to="/preview-loyalty">
          <img src="/assets/kareem-logo.png" alt="Kareem Pharma" />
          <div>
            <strong>برنامج كريم فارما للمكافآت</strong>
            <span>منصة رسمية للصيدليات</span>
          </div>
        </Link>
        <nav className="loyalty-nav">
          {publicNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/preview-loyalty"}>
              {item.label}
            </NavLink>
          ))}
          <a href="#contact">تواصل معنا</a>
        </nav>
      </header>
      <main className="loyalty-main">
        <Routes>
          <Route index element={<LoyaltyHome />} />
          <Route path="register" element={<RegistrationPage />} />
          <Route path="my-points" element={<MyPointsPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="about" element={<AboutPage />} />
        </Routes>
      </main>
      <footer className="loyalty-footer" id="contact">
        <div>
          <h3>تواصل مع كريم فارما</h3>
          <p>واتساب: 01145000445</p>
          <a href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">
            Facebook / KareemPharmaOfficial
          </a>
        </div>
        <div>
          <h3>الفروع</h3>
          <ul>
            {sampleBranches.map((branch) => (
              <li key={branch}>{branch}</li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}

function LoyaltyHome() {
  const offers = getLoyaltyOffers().slice(0, 3);
  return (
    <>
      <section className="loyalty-hero-panel">
        <div className="loyalty-hero-copy">
          <span className="loyalty-eyebrow">برنامج كريم فارما للمكافآت</span>
          <h1>اطلب أونلاين، اجمع نقاط، واستفد من مزايا حصرية لصيدليتك</h1>
          <p>كل تعامل رقمي مع كريم فارما يمكن أن يتحول إلى نقاط ومزايا قابلة للمتابعة من خلال برنامج المكافآت.</p>
          <div className="loyalty-actions">
            <Link className="loyalty-btn loyalty-btn-primary" to="/preview-loyalty/register">
              سجل صيدليتك الآن
            </Link>
            <Link className="loyalty-btn loyalty-btn-secondary" to="/preview-loyalty/my-points">
              اعرف رصيد نقاطك
            </Link>
            <Link className="loyalty-btn loyalty-btn-ghost" to="/preview-loyalty/offers">
              شاهد العروض
            </Link>
          </div>
        </div>
        <div className="loyalty-hero-aside">
          <div className="trust-panel">
            <strong>برنامج رسمي مخصص للصيدليات</strong>
            <p>لمتابعة النقاط والعروض والمزايا الناتجة عن التعامل عبر منصة كريم فارما الرقمية.</p>
          </div>
          <div className="stat-ribbon">
            <span>مزايا حسب مستوى التعامل</span>
            <b>برونزي / فضي / ذهبي / بلاتيني</b>
          </div>
        </div>
      </section>

      <section className="loyalty-section">
        <div className="loyalty-section-head">
          <span>مزايا واضحة</span>
          <h2>لماذا برنامج كريم فارما للمكافآت؟</h2>
        </div>
        <div className="loyalty-card-grid">
          {homeValueCards.map((item) => (
            <article key={item} className="loyalty-card">
              <b>+</b>
              <h3>{item}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="loyalty-section">
        <div className="loyalty-section-head">
          <span>كيف تعمل النقاط</span>
          <h2>كيف تجمع صيدليتك النقاط؟</h2>
        </div>
        <div className="loyalty-list-grid">
          {pointsPreviewCards.map((item) => (
            <article key={item} className="loyalty-list-card">
              {item}
            </article>
          ))}
        </div>
      </section>

      <section className="loyalty-section loyalty-digital-platform">
        <div>
          <span>الطلبات الرقمية</span>
          <h2>منصة كريم فارما الرقمية للطلبات</h2>
          <p>منصة رقمية تساعد الصيدليات على إرسال الطلبات بسهولة، متابعة العروض، وتقليل الاعتماد على طرق الطلب التقليدية.</p>
          <ul className="loyalty-inline-list">
            <li>طلب أسهل وأسرع</li>
            <li>عروض متجددة</li>
            <li>متابعة التعاملات</li>
            <li>دعم من فريق كريم فارما</li>
            <li>تجربة مخصصة للصيدليات</li>
          </ul>
          <Link className="loyalty-btn loyalty-btn-primary" to="/preview-loyalty/register">
            اطلب تفعيل حسابك
          </Link>
        </div>
        <div className="platform-visual-card">
          <strong>نقطة البداية</strong>
          <p>التسجيل والتفعيل والطلب الأونلاين كلها تتحول إلى سجل نقاط واضح وقابل للمراجعة.</p>
        </div>
      </section>

      <section className="loyalty-section">
        <div className="loyalty-section-head">
          <span>عروض مرنة</span>
          <h2>عروض كريم فارما للصيدليات</h2>
        </div>
        <div className="loyalty-offers-grid">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </section>

      <section className="loyalty-section loyalty-about-preview">
        <div>
          <span>عن الشركة</span>
          <h2>من هي كريم فارما؟</h2>
          <p>كريم فارما شركة مصرية متخصصة في توزيع الأدوية تأسست عام 2005.</p>
          <p>تُعد واحدة من أكبر شركات توزيع الأدوية في مصر، وحاصلة على شهادة GSDP الخاصة بجودة التخزين والتوزيع الدوائي.</p>
          <p>يرأسها د. رفاعي ربيع رئيس لجنة الموزعين بالشعبة العامة للأدوية.</p>
          <p>هدفنا تقديم خدمة توزيع احترافية تساعد الصيدليات على النمو وتحقيق أفضل تجربة شراء.</p>
        </div>
        <div className="badge-grid">
          {["تأسست عام 2005", "شهادة GSDP", "توزيع دوائي احترافي", "منصة رقمية للصيدليات"].map((badge) => (
            <article key={badge}>{badge}</article>
          ))}
        </div>
      </section>

      <section className="loyalty-section loyalty-contact-panel">
        <div>
          <span>الفروع والتواصل</span>
          <h2>خدمة تغطي احتياجات الصيدليات</h2>
          <ul className="loyalty-inline-list">
            {sampleBranches.map((branch) => (
              <li key={branch}>{branch}</li>
            ))}
          </ul>
        </div>
        <div className="contact-actions">
          <a className="loyalty-btn loyalty-btn-primary" href={whatsappUrl} target="_blank" rel="noreferrer">
            تواصل عبر واتساب
          </a>
          <a className="loyalty-btn loyalty-btn-secondary" href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">
            صفحة فيسبوك الرسمية
          </a>
        </div>
      </section>
    </>
  );
}

function RegistrationPage() {
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
    <section className="loyalty-page-grid">
      <article className="loyalty-surface">
        <span className="loyalty-eyebrow">طلب تسجيل</span>
        <h1>تسجيل صيدلية جديدة في المنصة وبرنامج المكافآت</h1>
        <p>سيتم استخدام هذه البيانات كطلب مبدئي لتفعيل الحساب الرقمي وربط برنامج المكافآت. هذه الصفحة تعمل ببيانات preview محلية حاليًا.</p>
        {submitted && (
          <div className="loyalty-alert">
            تم استلام طلبك بنجاح. سيقوم فريق كريم فارما بالتواصل معك لتفعيل حسابك وإرسال كود المستخدم وكلمة المرور الخاصة بمنصة كريم فارما الرقمية.
          </div>
        )}
        <form className="loyalty-form" onSubmit={handleSubmit}>
          <input required placeholder="اسم الصيدلية" value={form.pharmacyName} onChange={(e) => setForm({ ...form, pharmacyName: e.target.value })} />
          <input required placeholder="اسم المسؤول" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <input required placeholder="رقم واتساب" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <input required type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select required value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })}>
            <option value="">المحافظة</option>
            {loyaltyGovernorates.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input required placeholder="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <select value={form.requestType} onChange={(e) => setForm({ ...form, requestType: e.target.value })}>
            <option value="عميل حالي">عميل حالي</option>
            <option value="تكويد جديد">تكويد جديد</option>
          </select>
          <input placeholder="كود العميل إن وجد" value={form.customerCode} onChange={(e) => setForm({ ...form, customerCode: e.target.value })} />
          <button className="loyalty-btn loyalty-btn-primary" type="submit">
            إرسال الطلب
          </button>
        </form>
      </article>
      <article className="loyalty-surface">
        <span className="loyalty-eyebrow">حالات المتابعة</span>
        <h2>الحالات الإدارية المقترحة</h2>
        <ul className="loyalty-inline-list">
          {requestStatuses.map((status) => (
            <li key={status}>{status}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}

function MyPointsPage() {
  const currentLevel = getCurrentLevel(2450);
  return (
    <section className="loyalty-stack">
      <article className="loyalty-surface">
        <div className="loyalty-section-head compact">
          <div>
            <span>بيانات الصيدلية</span>
            <h1>نقاط صيدلية النور</h1>
          </div>
          <div className="profile-note">
            <strong>كود العميل: 10025</strong>
            <span>المحافظة: الجيزة</span>
          </div>
        </div>
        <div className="points-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>
      </article>

      <article className="loyalty-surface level-panel">
        <div>
          <span className="loyalty-eyebrow">مستوى التعامل</span>
          <h2>المستوى الحالي: {currentLevel.name}</h2>
          <p>المتبقي للوصول إلى الذهبي: {nextLevelGap(2450)} نقطة</p>
        </div>
        <div className="level-track">
          {loyaltyLevels.map((level) => (
            <article key={level.name} className={level.name === currentLevel.name ? "active" : ""}>
              <strong>{level.name}</strong>
              <span>
                {level.min} - {Number.isFinite(level.max) ? level.max : "فأكثر"}
              </span>
            </article>
          ))}
        </div>
      </article>

      <article className="loyalty-surface">
        <div className="loyalty-section-head compact">
          <div>
            <span>كشف النقاط</span>
            <h2>تفاصيل العمليات</h2>
          </div>
          <p>تعرض هذه الصفحة مصدر كل نقطة أو استبدال لرفع الشفافية والثقة.</p>
        </div>
        <div className="ledger-table">
          <div className="ledger-row ledger-head">
            <span>التاريخ</span>
            <span>نوع النقاط</span>
            <span>الوصف</span>
            <span>عدد النقاط</span>
            <span>المرجع</span>
          </div>
          {sampleLedger.map((item) => (
            <div className="ledger-row" key={item.id}>
              <span>{formatDate(item.date)}</span>
              <span>{item.type}</span>
              <span>{item.description}</span>
              <strong className={item.points < 0 ? "negative" : "positive"}>{item.points > 0 ? `+${item.points}` : item.points}</strong>
              <span>{item.reference}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function OffersPage() {
  const offers = getLoyaltyOffers();
  return (
    <section className="loyalty-stack">
      <article className="loyalty-surface">
        <span className="loyalty-eyebrow">عروض مرنة وقابلة للتحديث</span>
        <h1>عروض برنامج كريم فارما للمكافآت</h1>
        <p>كل عرض يحتوي على قيمة المكافأة، مدة السريان، والشروط المختصرة، مع مسار مباشر للتواصل عبر واتساب.</p>
      </article>
      <div className="loyalty-offers-grid">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </section>
  );
}

function OfferCard({ offer }) {
  const link = `https://wa.me/2${whatsappNumber}?text=${encodeURIComponent(offer.whatsappCTA || whatsappMessage)}`;
  return (
    <article className="offer-preview-card">
      <div className="offer-banner-preview" style={{ background: offer.bannerImage }}>
        <span>{offer.offerType}</span>
        <strong>{offer.giftValue || `${offer.pointsReward} نقطة`}</strong>
      </div>
      <div className="offer-preview-body">
        <h3>{offer.title}</h3>
        <p>{offer.shortDescription}</p>
        <div className="offer-meta">
          <span>ينتهي في {formatDate(offer.endDate)}</span>
          <span>{offer.terms}</span>
        </div>
        <a className="loyalty-btn loyalty-btn-primary" href={link} target="_blank" rel="noreferrer">
          اطلب العرض على واتساب
        </a>
      </div>
    </article>
  );
}

function HowItWorksPage() {
  return (
    <section className="loyalty-stack">
      <article className="loyalty-surface">
        <span className="loyalty-eyebrow">دليل النقاط</span>
        <h1>كيف يعمل برنامج كريم فارما للمكافآت؟</h1>
      </article>
      <article className="loyalty-surface">
        <h2>أنواع النقاط</h2>
        <ul className="loyalty-inline-list">
          {["نقاط ترحيبية", "نقاط الطلبات الأونلاين", "نقاط العروض", "نقاط الحملات", "نقاط إدارية", "نقاط مستبدلة"].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
      <article className="loyalty-surface">
        <h2>طرق جمع النقاط</h2>
        <div className="loyalty-list-grid">
          {[
            "التسجيل في برنامج المكافآت",
            "تفعيل حساب منصة كريم فارما الرقمية",
            "أول طلب أونلاين",
            "كل طلب أونلاين",
            "شراء أصناف مشاركة في عروض النقاط",
            "تحقيق أهداف شهرية",
            "المشاركة في حملات خاصة"
          ].map((item) => (
            <div key={item} className="loyalty-list-card">
              {item}
            </div>
          ))}
        </div>
      </article>
      <article className="loyalty-surface">
        <h2>مستويات المكافآت</h2>
        <div className="level-track">
          {loyaltyLevels.map((level) => (
            <article key={level.name}>
              <strong>{level.name}</strong>
              <span>
                {level.min} إلى {Number.isFinite(level.max) ? level.max : "فأكثر"} نقطة
              </span>
            </article>
          ))}
        </div>
      </article>
      <article className="loyalty-surface">
        <h2>استبدال النقاط</h2>
        <p>يمكن استبدال النقاط وفق العروض والسياسات المعلنة من كريم فارما، مثل خصومات، رصيد مكافآت، بضاعة مجانية، أو مزايا خاصة.</p>
      </article>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="loyalty-stack">
      <article className="loyalty-surface">
        <span className="loyalty-eyebrow">عن كريم فارما</span>
        <h1>شركة توزيع دوائي بخبرة تشغيلية وتحول رقمي</h1>
        <p>كريم فارما شركة مصرية متخصصة في توزيع الأدوية تأسست عام 2005.</p>
        <p>تُعد واحدة من أكبر شركات توزيع الأدوية في مصر، وحاصلة على شهادة GSDP الخاصة بجودة التخزين والتوزيع الدوائي.</p>
        <p>يرأسها د. رفاعي ربيع رئيس لجنة الموزعين بالشعبة العامة للأدوية.</p>
        <p>هدفنا تقديم خدمة توزيع احترافية تساعد الصيدليات على النمو وتحقيق أفضل تجربة شراء.</p>
      </article>
      <div className="loyalty-card-grid">
        {[
          ["تاريخ الشركة", "نمو مستمر في خدمة الصيدليات منذ 2005."],
          ["الجودة والتخزين والتوزيع", "معايير جودة تشغيلية ودعم لشبكة توزيع موثوقة."],
          ["دعم الصيدليات", "خدمة مخصصة للصيدليات ومتابعة احتياجاتها التجارية."],
          ["التحول الرقمي", "التركيز على الطلبات الرقمية وتحسين تجربة الشراء."],
          ["منصة كريم فارما الرقمية", "واجهة حديثة لدعم الطلب، العرض، والمتابعة."]
        ].map(([title, text]) => (
          <article key={title} className="loyalty-card detail">
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminPage() {
  const [registrations, setRegistrations] = useState([]);
  const [offers, setOffers] = useState(sampleOffers);
  const [newOffer, setNewOffer] = useState({
    title: "",
    shortDescription: "",
    offerType: rewardTypes[0],
    giftValue: "",
    startDate: "2026-06-15",
    endDate: "2026-07-15",
    terms: "",
    bannerImage: "linear-gradient(135deg, #163a63, #f08b24)"
  });

  useEffect(() => {
    setRegistrations(getLoyaltyRegistrationRequests());
    setOffers(getLoyaltyOffers());
  }, []);

  const updateStatus = (id, status) => {
    updateLoyaltyRegistrationStatus(id, status);
    setRegistrations(getLoyaltyRegistrationRequests());
  };

  const toggleOffer = (id) => {
    const next = offers.map((offer) => (offer.id === id ? { ...offer, active: !offer.active } : offer));
    setOffers(next);
    saveLoyaltyOffers(next);
  };

  const createOffer = (event) => {
    event.preventDefault();
    const next = [
      {
        id: `offer-${Date.now()}`,
        ...newOffer,
        active: true,
        pointsReward: 0,
        whatsappCTA: whatsappMessage
      },
      ...offers
    ];
    setOffers(next);
    saveLoyaltyOffers(next);
    setNewOffer({
      title: "",
      shortDescription: "",
      offerType: rewardTypes[0],
      giftValue: "",
      startDate: "2026-06-15",
      endDate: "2026-07-15",
      terms: "",
      bannerImage: "linear-gradient(135deg, #163a63, #f08b24)"
    });
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <span>Prototype Only</span>
          <h1>لوحة إدارة برنامج كريم فارما للمكافآت</h1>
        </div>
        <Link className="loyalty-btn loyalty-btn-secondary" to="/preview-loyalty">
          العودة إلى المعاينة العامة
        </Link>
      </header>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>إدارة الصيدليات</h2>
          <div className="mini-table">
            {samplePharmacies.map((pharmacy) => (
              <div key={pharmacy.id} className="mini-row">
                <strong>{pharmacy.pharmacyName}</strong>
                <span>كود العميل: {pharmacy.customerCode}</span>
                <span>حالة التسجيل: {pharmacy.registrationStatus}</span>
                <span>حالة التفعيل: {pharmacy.activationStatus}</span>
                <span>الرصيد: {pharmacy.pointsBalance}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <h2>طلبات التسجيل</h2>
          <div className="mini-table">
            {registrations.map((request) => (
              <div key={request.id} className="mini-row">
                <strong>{request.pharmacyName}</strong>
                <span>{request.requestType}</span>
                <span>{request.whatsapp}</span>
                <div className="status-row">
                  <select value={request.status} onChange={(e) => updateStatus(request.id, e.target.value)}>
                    {requestStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <small>كود العميل: {request.customerCode || "غير محدد"}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <h2>رفع النقاط</h2>
          <div className="upload-placeholder">
            <input type="file" disabled />
            <p>Placeholder لرفع Excel/CSV مع معاينة قبل الاستيراد.</p>
            <div className="upload-stats">
              <span>الملف: {sampleUploadPreview.filename}</span>
              <span>Valid: {sampleUploadPreview.validRows}</span>
              <span>Duplicate: {sampleUploadPreview.duplicateRows}</span>
              <span>Error: {sampleUploadPreview.errorRows}</span>
              <span>Confirm import</span>
            </div>
            <div className="mini-table">
              {sampleUploadPreview.rows.map((row, index) => (
                <div key={`${row.referenceId}-${index}`} className="mini-row">
                  <strong>{row.referenceId}</strong>
                  <span>Customer: {row.customerCode || "Missing"}</span>
                  <span>Points: {row.points}</span>
                  <span>Status: {row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="admin-card">
          <h2>قواعد النقاط</h2>
          <div className="mini-table">
            {samplePointsRules.map((rule) => (
              <div key={rule.id} className="mini-row">
                <strong>{rule.title}</strong>
                <span>{rule.label}</span>
                <span>{rule.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card wide">
          <h2>إدارة العروض</h2>
          <form className="loyalty-form offer-admin-form" onSubmit={createOffer}>
            <input required placeholder="عنوان العرض" value={newOffer.title} onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })} />
            <input required placeholder="وصف مختصر" value={newOffer.shortDescription} onChange={(e) => setNewOffer({ ...newOffer, shortDescription: e.target.value })} />
            <select value={newOffer.offerType} onChange={(e) => setNewOffer({ ...newOffer, offerType: e.target.value })}>
              {rewardTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input placeholder="قيمة المكافأة" value={newOffer.giftValue} onChange={(e) => setNewOffer({ ...newOffer, giftValue: e.target.value })} />
            <input type="date" value={newOffer.startDate} onChange={(e) => setNewOffer({ ...newOffer, startDate: e.target.value })} />
            <input type="date" value={newOffer.endDate} onChange={(e) => setNewOffer({ ...newOffer, endDate: e.target.value })} />
            <input className="full" placeholder="الشروط" value={newOffer.terms} onChange={(e) => setNewOffer({ ...newOffer, terms: e.target.value })} />
            <button className="loyalty-btn loyalty-btn-primary full" type="submit">
              create/edit offer
            </button>
          </form>
          <div className="loyalty-offers-grid compact">
            {offers.map((offer) => (
              <article key={offer.id} className="offer-preview-card">
                <div className="offer-banner-preview" style={{ background: offer.bannerImage }}>
                  <span>{offer.offerType}</span>
                  <strong>{offer.giftValue || "Reward"}</strong>
                </div>
                <div className="offer-preview-body">
                  <h3>{offer.title}</h3>
                  <p>{offer.shortDescription}</p>
                  <button className="loyalty-btn loyalty-btn-secondary" type="button" onClick={() => toggleOffer(offer.id)}>
                    {offer.active ? "active" : "inactive"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <h2>دفتر النقاط</h2>
          <div className="mini-table">
            {sampleLedger.map((item) => (
              <div key={item.id} className="mini-row">
                <strong>{item.description}</strong>
                <span>Customer: 10025</span>
                <span>Type: {item.type}</span>
                <span>Points: {item.points}</span>
                <span>Reference: {item.reference}</span>
                <span>Date: {item.date}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <h2>الاستبدالات</h2>
          <div className="mini-table">
            {sampleRedemptions.map((item) => (
              <div key={item.id} className="mini-row">
                <strong>{item.pharmacy}</strong>
                <span>status: {item.status}</span>
                <span>points used: {item.pointsUsed}</span>
                <span>reward given: {item.rewardGiven}</span>
                <span>{item.date}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default LoyaltyPreviewApp;
