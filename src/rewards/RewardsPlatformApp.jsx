import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { isSupabaseConfigured } from "../services/supabaseClient";
import {
  CONTACT_BRANCHES,
  DEFAULT_LEVELS,
  GOVERNORATES,
  WHATSAPP_DEFAULT_MESSAGE,
  addManualPointsRecord,
  clearSelectedPharmacy,
  exportRowsToCsv,
  fetchActiveOffers,
  fetchAdminDataset,
  fetchLedgerForPharmacy,
  fetchLoyaltyLevels,
  fetchRedemptionsForPharmacy,
  getWhatsappUrl,
  hydrateSelectedPharmacy,
  lookupPharmacy,
  mapOfferRow,
  readSelectedPharmacy,
  saveOffer,
  submitRegistrationRequest,
  summarizeLedger,
  toggleOfferActiveState,
  updateRegistrationRequestStatus
} from "./rewardsData";

const NAV_ITEMS = [
  { to: "/", label: "الرئيسية" },
  { to: "/offers", label: "العروض" },
  { to: "/my-points", label: "نقاطي" },
  { to: "/register", label: "التسجيل" },
  { to: "/how-it-works", label: "كيف يعمل" },
  { to: "/about", label: "عن كريم فارما" },
  { to: "/contact", label: "التواصل" }
];

const MOBILE_NAV_ITEMS = [
  { to: "/", label: "الرئيسية", icon: "H" },
  { to: "/offers", label: "العروض", icon: "%" },
  { to: "/my-points", label: "نقاطي", icon: "P", featured: true },
  { to: "/register", label: "التسجيل", icon: "+" },
  { to: "/more", label: "المزيد", icon: "M" }
];

const VALUE_CARDS = [
  { title: "نقاط ترحيبية", text: "رصيد افتتاحي بعد التسجيل والتفعيل." },
  { title: "نقاط على الطلبات", text: "كل طلب مؤهل يضاف إلى رصيد الصيدلية." },
  { title: "عروض حصرية", text: "مزايا مرتبطة بالتعاملات والعروض النشطة." },
  { title: "تفعيل المنصة الرقمية", text: "بوابة أساسية للطلبات والمتابعة." }
];

const START_STEPS = [
  "سجل صيدليتك",
  "فعّل حسابك على منصة كريم فارما الرقمية",
  "اطلب أونلاين واجمع نقاط"
];

const DIGITAL_BENEFITS = [
  "طلب أسهل وأسرع",
  "عروض متجددة",
  "متابعة التعاملات",
  "دعم من فريق كريم فارما"
];

const POINT_TYPE_LABELS = {
  welcome: "نقاط ترحيبية",
  online_orders: "نقاط الطلبات الأونلاين",
  offers: "نقاط العروض",
  campaigns: "نقاط الحملات",
  admin: "نقاط إدارية",
  redemption: "نقاط مستبدلة"
};

const EMPTY_POINTS_MESSAGE =
  "لا توجد نقاط مسجلة حتى الآن. سيتم تحديث رصيدك بعد تفعيل الحساب أو أول تعامل مؤهل للنقاط.";

const DEFAULT_OFFER_FORM = {
  id: "",
  title: "",
  shortDescription: "",
  bannerUrl: "",
  offerType: "",
  rewardText: "",
  pointsReward: 0,
  giftValue: "",
  startDate: "",
  endDate: "",
  terms: "",
  isActive: true,
  whatsappMessage: WHATSAPP_DEFAULT_MESSAGE,
  sortOrder: 0
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  return prefersReducedMotion;
}

function useCountUp(value) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(() => Number(value) || 0);
  const previousValueRef = useRef(Number(value) || 0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (prefersReducedMotion) {
      setDisplayValue(target);
      previousValueRef.current = target;
      return undefined;
    }
    let frameId = 0;
    let startTime = 0;
    const duration = 700;
    const initial = previousValueRef.current;

    const tick = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(initial + (target - initial) * eased));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = target;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [prefersReducedMotion, value]);

  return displayValue;
}

function AnimatedNumber({ value }) {
  const count = useCountUp(value);
  return <>{count.toLocaleString("en-US")}</>;
}

function RewardsPlatformApp() {
  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [offers, setOffers] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(readSelectedPharmacy());
  const [pharmacyLedger, setPharmacyLedger] = useState([]);
  const [pharmacyRedemptions, setPharmacyRedemptions] = useState([]);
  const [homeStatus, setHomeStatus] = useState({ loading: true, offersError: "", pointsError: "" });

  useEffect(() => {
    let active = true;
    const loadPublicData = async () => {
      const [levelsData, offersData, storedPharmacy] = await Promise.all([
        fetchLoyaltyLevels(),
        fetchActiveOffers(),
        hydrateSelectedPharmacy()
      ]);
      if (!active) return;
      setLevels(levelsData);
      setOffers(offersData);
      setSelectedPharmacy(storedPharmacy || null);
      setHomeStatus({ loading: false, offersError: "", pointsError: "" });
    };
    loadPublicData().catch((error) => {
      console.error("[Rewards:public-load]", error);
      if (!active) return;
      setHomeStatus({
        loading: false,
        offersError: "تعذر تحميل العروض حالياً.",
        pointsError: "تعذر تحميل بيانات النقاط."
      });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadSelectedPharmacyData = async () => {
      if (!selectedPharmacy?.customerCode) {
        setPharmacyLedger([]);
        setPharmacyRedemptions([]);
        return;
      }
      const [ledgerRows, redemptionRows] = await Promise.all([
        fetchLedgerForPharmacy({ pharmacyId: selectedPharmacy.id, customerCode: selectedPharmacy.customerCode }),
        fetchRedemptionsForPharmacy({ pharmacyId: selectedPharmacy.id, customerCode: selectedPharmacy.customerCode })
      ]);
      if (!active) return;
      setPharmacyLedger(ledgerRows);
      setPharmacyRedemptions(redemptionRows);
    };
    loadSelectedPharmacyData().catch((error) => {
      console.error("[Rewards:lookup-data]", error);
      if (!active) return;
      setPharmacyLedger([]);
      setPharmacyRedemptions([]);
    });
    return () => {
      active = false;
    };
  }, [selectedPharmacy]);

  const pointsSummary = useMemo(
    () => summarizeLedger(pharmacyLedger, levels),
    [levels, pharmacyLedger]
  );

  const context = {
    levels,
    offers,
    selectedPharmacy,
    setSelectedPharmacy,
    pharmacyLedger,
    pharmacyRedemptions,
    pointsSummary,
    homeStatus,
    reloadOffers: async () => setOffers(await fetchActiveOffers()),
    reloadSelectedPharmacy: async (pharmacy) => {
      const nextPharmacy = pharmacy || (await hydrateSelectedPharmacy());
      setSelectedPharmacy(nextPharmacy || null);
    }
  };

  return (
    <div className="rewards-shell">
      <div className="rewards-backdrop" />
      <Header hasPoints={pointsSummary.availablePoints > 0} />
      <main className="rewards-main">
        <Routes>
          <Route index element={<HomePage context={context} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/my-points" element={<MyPointsPage context={context} />} />
          <Route path="/offers" element={<OffersPage offers={offers} loading={homeStatus.loading} error={homeStatus.offersError} />} />
          <Route path="/how-it-works" element={<HowItWorksPage levels={levels} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/more" element={<MorePage hasPoints={pointsSummary.availablePoints > 0} />} />
          <Route path="/admin" element={<AdminPage levels={levels} onReloadOffers={context.reloadOffers} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <MobileNav points={pointsSummary.availablePoints} />
    </div>
  );
}

function Header() {
  return (
    <header className="rewards-header reveal">
      <Link className="rewards-brand" to="/">
        <img src="/assets/kareem-logo.png" alt="Kareem Pharma" />
        <div>
          <strong>برنامج كريم فارما للمكافآت</strong>
          <span>منصة رسمية للصيدليات</span>
        </div>
      </Link>

      <nav className="rewards-desktop-nav" aria-label="التنقل الرئيسي">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <a className="header-contact-btn" href={getWhatsappUrl()} target="_blank" rel="noreferrer">
        تواصل معنا
      </a>
    </header>
  );
}

function HomePage({ context }) {
  const pointsPreviewTitle = context.selectedPharmacy
    ? `صيدلية ${context.selectedPharmacy.pharmacyName}`
    : "تابع رصيدك بعد الربط";

  return (
    <div className="page-stack">
      <section className="hero-grid reveal">
        <article className="hero-card">
          <span className="eyebrow">برنامج كريم فارما للمكافآت</span>
          <h1>اطلب أونلاين من كريم فارما، اجمع نقاط، واستفد من مزايا حصرية لصيدليتك</h1>
          <p>كل تعامل رقمي مع كريم فارما يمكن أن يتحول إلى نقاط ومزايا قابلة للمتابعة من خلال برنامج المكافآت.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary cta-shimmer" to="/register">
              سجل صيدليتك
            </Link>
            <Link className="btn btn-secondary" to="/my-points">
              نقاطي
            </Link>
            <Link className="btn btn-tertiary" to="/offers">
              العروض
            </Link>
          </div>
        </article>

        <article className="points-preview-card">
          <span className="eyebrow">معاينة نقاطي</span>
          <strong className="points-number">
            <AnimatedNumber value={context.pointsSummary.availablePoints} />
          </strong>
          <p>{pointsPreviewTitle}</p>
          <div className="mini-stats">
            <div>
              <span>المستوى</span>
              <strong>{context.pointsSummary.currentLevel.levelName}</strong>
            </div>
            <div>
              <span>آخر حركة</span>
              <strong>{context.pointsSummary.lastMovement?.description || "لا توجد حركة بعد"}</strong>
            </div>
          </div>
          <Link className="inline-cta" to="/my-points">
            اعرف رصيد نقاطك
          </Link>
        </article>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="مزايا سريعة" subtitle="أربع نقاط أساسية" />
        <div className="compact-grid columns-4">
          {VALUE_CARDS.map((card) => (
            <article key={card.title} className="compact-tile">
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="ابدأ في 3 خطوات" subtitle="مسار واضح" />
        <div className="compact-grid columns-3">
          {START_STEPS.map((step, index) => (
            <article key={step} className="step-tile">
              <b>{index + 1}</b>
              <strong>{step}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="العروض الحالية" subtitle="من Supabase" />
        <OffersPreview offers={context.offers} loading={context.homeStatus.loading} error={context.homeStatus.offersError} limit={3} />
      </section>

      <section className="section-card reveal">
        <SectionHeading title="منصة كريم فارما الرقمية للطلبات" subtitle="للصيدليات فقط" />
        <div className="platform-grid">
          <div className="platform-copy">
            <p>منصة رقمية تساعد الصيدليات على إرسال الطلبات بسهولة، متابعة العروض، وتقليل الاعتماد على طرق الطلب التقليدية.</p>
            <ul className="benefits-list">
              {DIGITAL_BENEFITS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link className="btn btn-primary cta-shimmer" to="/register">
              اطلب تفعيل حسابك
            </Link>
          </div>
          <div className="platform-panel">
            <span>التعامل الرقمي</span>
            <strong>طلبات + عروض + نقاط</strong>
            <p>واجهة موحدة لمتابعة الرصيد والعروض والطلبات المؤهلة للمكافآت.</p>
          </div>
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="من هي كريم فارما؟" subtitle="ثقة مختصرة" />
        <div className="compact-grid columns-4">
          <TrustTile title="تأسست عام 2005" />
          <TrustTile title="شهادة GSDP" />
          <TrustTile title="توزيع دوائي احترافي" />
          <TrustTile title="منصة رقمية للصيدليات" />
        </div>
      </section>
    </div>
  );
}

function RegisterPage() {
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
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    try {
      await submitRegistrationRequest(form);
      setSuccess(true);
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
    } catch (error) {
      setErrorMessage(
        isSupabaseConfigured
          ? "تعذر إرسال الطلب حالياً. حاول مرة أخرى أو تواصل مع فريق كريم فارما."
          : "ربط Supabase غير متاح حالياً، لذلك لا يمكن إرسال الطلب من هذه البيئة."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack narrow">
      <section className="section-card reveal">
        <SectionHeading title="طلب تسجيل صيدلية" subtitle="نموذج قصير" />
        {success ? (
          <div className="feedback-card success">
            <strong>تم استلام طلبك بنجاح.</strong>
            <p>سيقوم فريق كريم فارما بالتواصل معك لتفعيل حسابك وإرسال كود المستخدم وكلمة المرور الخاصة بمنصة كريم فارما الرقمية.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setSuccess(false)}>
              إرسال طلب جديد
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
              {GOVERNORATES.map((item) => (
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
            {errorMessage && <div className="feedback-inline error">{errorMessage}</div>}
            <button className="btn btn-primary full-width cta-shimmer" type="submit" disabled={submitting}>
              {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function MyPointsPage({ context }) {
  const [lookup, setLookup] = useState({
    customerCode: context.selectedPharmacy?.customerCode || "",
    whatsapp: context.selectedPharmacy?.whatsapp || ""
  });
  const [tab, setTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const handleLookup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setLookupError("");
    try {
      const pharmacy = await lookupPharmacy(lookup);
      if (!pharmacy) {
        context.setSelectedPharmacy(null);
        clearSelectedPharmacy();
        setLookupError("لم نتمكن من العثور على بيانات الصيدلية. يمكنك طلب التسجيل أو التواصل مع فريق كريم فارما.");
      } else {
        context.setSelectedPharmacy(pharmacy);
      }
    } catch {
      setLookupError("تعذر تنفيذ البحث حالياً. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const selected = context.selectedPharmacy;
  const summaryCards = [
    { label: "نقاط هذا الشهر", value: context.pointsSummary.monthlyPoints },
    { label: "المستوى الحالي", value: context.pointsSummary.currentLevel.levelName },
    { label: "المتبقي للمستوى التالي", value: context.pointsSummary.nextLevelGap || "مكتمل" }
  ];
  const categoryCards = [
    { label: "نقاط ترحيبية", value: context.pointsSummary.categories.welcome },
    { label: "نقاط الطلبات الأونلاين", value: context.pointsSummary.categories.onlineOrders },
    { label: "نقاط العروض", value: context.pointsSummary.categories.offers },
    { label: "نقاط الحملات", value: context.pointsSummary.categories.campaigns }
  ];

  return (
    <div className="page-stack">
      {!selected && (
        <section className="section-card reveal narrow-card">
          <SectionHeading title="عرض نقاطي" subtitle="بحث بكود العميل وواتساب" />
          <form className="lookup-form" onSubmit={handleLookup}>
            <input
              required
              placeholder="كود العميل"
              value={lookup.customerCode}
              onChange={(event) => setLookup((current) => ({ ...current, customerCode: event.target.value }))}
            />
            <input
              required
              placeholder="رقم واتساب"
              value={lookup.whatsapp}
              onChange={(event) => setLookup((current) => ({ ...current, whatsapp: event.target.value }))}
            />
            {lookupError && <div className="feedback-inline error">{lookupError}</div>}
            <button type="submit" className="btn btn-primary cta-shimmer" disabled={loading}>
              {loading ? "جاري البحث..." : "عرض نقاطي"}
            </button>
          </form>
        </section>
      )}

      {selected && (
        <>
          <section className="section-card reveal">
            <div className="profile-topbar">
              <div>
                <span>أهلاً</span>
                <strong>
                  {selected.contactName ? `د/ ${selected.contactName} - ${selected.pharmacyName}` : selected.pharmacyName}
                </strong>
              </div>
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  clearSelectedPharmacy();
                  context.setSelectedPharmacy(null);
                  setLookup({ customerCode: "", whatsapp: "" });
                }}
              >
                بحث جديد
              </button>
            </div>

            <div className="profile-strip">
              <div>
                <span>اسم الصيدلية</span>
                <strong>{selected.pharmacyName}</strong>
              </div>
              <div>
                <span>كود العميل</span>
                <strong>{selected.customerCode}</strong>
              </div>
              <div>
                <span>المحافظة</span>
                <strong>{selected.governorate || "غير محددة"}</strong>
              </div>
            </div>
          </section>

          <section className="points-hero reveal">
            <span className="eyebrow">رصيدك الحالي</span>
            <strong className="points-number">
              <AnimatedNumber value={context.pointsSummary.availablePoints} />
            </strong>
            <p>يعتمد الرصيد على جدول points_ledger كمصدر أساسي للحركات.</p>
          </section>

          <section className="compact-grid columns-3 reveal">
            {summaryCards.map((item) => (
              <article key={item.label} className="compact-tile metric">
                <span>{item.label}</span>
                <strong>{typeof item.value === "number" ? <AnimatedNumber value={item.value} /> : item.value}</strong>
              </article>
            ))}
          </section>

          <section className="section-card reveal">
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
              <div className="compact-grid columns-4">
                {categoryCards.map((item) => (
                  <article key={item.label} className="compact-tile">
                    <span>{item.label}</span>
                    <strong>
                      <AnimatedNumber value={item.value} />
                    </strong>
                  </article>
                ))}
              </div>
            )}

            {tab === "details" && (
              context.pharmacyLedger.length ? (
                <div className="ledger-table">
                  <div className="ledger-row ledger-head">
                    <span>التاريخ</span>
                    <span>النوع</span>
                    <span>الوصف</span>
                    <span>النقاط</span>
                    <span>المرجع</span>
                  </div>
                  {context.pharmacyLedger.map((item) => (
                    <div key={item.id} className="ledger-row">
                      <span>{formatDate(item.transactionDate)}</span>
                      <span>{POINT_TYPE_LABELS[item.pointsType] || item.pointsType}</span>
                      <span>{item.description || "-"}</span>
                      <strong className={item.points < 0 ? "negative" : "positive"}>
                        {item.points > 0 ? `+${item.points}` : item.points}
                      </strong>
                      <span>{item.referenceId || "-"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message={EMPTY_POINTS_MESSAGE} />
              )
            )}

            {tab === "redemption" && (
              context.pharmacyRedemptions.length ? (
                <div className="compact-grid columns-3">
                  {context.pharmacyRedemptions.map((item) => (
                    <article key={item.id} className="compact-tile redemption">
                      <strong>{item.rewardDescription || item.rewardType || "استبدال"}</strong>
                      <p>{item.pointsUsed} نقطة</p>
                      <span>{item.status || "-"}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState message="لا توجد عمليات استبدال مسجلة حالياً." />
              )
            )}
          </section>
        </>
      )}
    </div>
  );
}

function OffersPage({ offers, loading, error }) {
  return (
    <div className="page-stack">
      <section className="section-card reveal">
        <SectionHeading title="العروض والحملات" subtitle="عروض نشطة فقط" />
        <OffersPreview offers={offers} loading={loading} error={error} />
      </section>
    </div>
  );
}

function OffersPreview({ offers, loading, error, limit = null }) {
  if (loading) return <EmptyState message="جاري تحميل العروض..." />;
  if (error) return <EmptyState message={error} />;
  if (!offers.length) return <EmptyState message="لا توجد عروض نشطة حالياً. تابع الصفحة لمعرفة أحدث عروض كريم فارما." />;
  return (
    <div className="offers-grid">
      {(limit ? offers.slice(0, limit) : offers).map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

function OfferCard({ offer }) {
  const rewardLabel = offer.rewardText || (offer.pointsReward ? `${offer.pointsReward} نقطة` : offer.giftValue ? String(offer.giftValue) : "عرض");
  return (
    <article className="offer-card">
      <div className="offer-banner">
        {offer.bannerUrl ? <img src={offer.bannerUrl} alt={offer.title} /> : <div className="offer-fallback-banner">{offer.offerType || "عرض"}</div>}
      </div>
      <div className="offer-body">
        <strong className="offer-value">{rewardLabel}</strong>
        <h3>{offer.title}</h3>
        <p>{offer.shortDescription || "عرض مخصص للصيدليات."}</p>
        <div className="offer-meta">
          <span>{offer.offerType || "مزايا"}</span>
          <span>{offer.terms || "تطبق الشروط حسب العرض."}</span>
          <span>{offer.endDate ? `ينتهي ${formatDate(offer.endDate)}` : "متاح حالياً"}</span>
        </div>
        <a className="btn btn-primary" href={getWhatsappUrl(offer.whatsappMessage || WHATSAPP_DEFAULT_MESSAGE)} target="_blank" rel="noreferrer">
          اطلب العرض
        </a>
      </div>
    </article>
  );
}

function HowItWorksPage({ levels }) {
  return (
    <div className="page-stack">
      <section className="section-card reveal">
        <SectionHeading title="كيف تجمع النقاط؟" subtitle="دليل قصير" />
        <div className="compact-grid columns-4">
          {[
            "سجل صيدليتك",
            "فعّل المنصة الرقمية",
            "اطلب أونلاين",
            "استفد من العروض"
          ].map((item, index) => (
            <article key={item} className="guide-tile">
              <b>{index + 1}</b>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="أنواع النقاط" subtitle="تصنيف مختصر" />
        <div className="compact-grid columns-3">
          {Object.values(POINT_TYPE_LABELS).map((label) => (
            <article key={label} className="compact-tile">
              <strong>{label}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="مستويات المكافآت" subtitle="حسب إجمالي النقاط" />
        <div className="compact-grid columns-4">
          {levels.map((level) => (
            <article key={level.id || level.levelName} className="level-tile">
              <strong>{level.levelName}</strong>
              <span>
                {level.minPoints} إلى {Number.isFinite(level.maxPoints) ? level.maxPoints : "فأكثر"} نقطة
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="استبدال النقاط" subtitle="وفق العروض والسياسات" />
        <p className="support-copy">
          يمكن استبدال النقاط وفق العروض والسياسات المعلنة من كريم فارما، مثل خصومات، رصيد مكافآت، بضاعة مجانية، أو مزايا خاصة.
        </p>
      </section>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="page-stack">
      <section className="section-card reveal">
        <SectionHeading title="من هي كريم فارما؟" subtitle="نبذة رسمية" />
        <div className="about-grid">
          <p>كريم فارما شركة مصرية متخصصة في توزيع الأدوية تأسست عام 2005.</p>
          <p>تُعد واحدة من أكبر شركات توزيع الأدوية في مصر، وحاصلة على شهادة GSDP الخاصة بجودة التخزين والتوزيع الدوائي.</p>
          <p>يرأسها د. رفاعي ربيع رئيس لجنة الموزعين بالشعبة العامة للأدوية.</p>
          <p>هدفنا تقديم خدمة توزيع احترافية تساعد الصيدليات على النمو وتحقيق أفضل تجربة شراء.</p>
        </div>
        <div className="compact-grid columns-4">
          <TrustTile title="تأسست عام 2005" />
          <TrustTile title="شهادة GSDP" />
          <TrustTile title="توزيع دوائي احترافي" />
          <TrustTile title="منصة رقمية للصيدليات" />
        </div>
      </section>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="page-stack">
      <section className="section-card reveal">
        <SectionHeading title="الفروع والتواصل" subtitle="خدمة كريم فارما" />
        <div className="compact-grid columns-3">
          {CONTACT_BRANCHES.map((branch) => (
            <article key={branch} className="compact-tile">
              <strong>{branch}</strong>
            </article>
          ))}
        </div>
        <div className="contact-links">
          <a className="btn btn-primary" href={getWhatsappUrl()} target="_blank" rel="noreferrer">
            واتساب: 01145000445
          </a>
          <a className="btn btn-secondary" href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">
            Facebook / KareemPharmaOfficial
          </a>
        </div>
      </section>
    </div>
  );
}

function MorePage() {
  return (
    <div className="page-stack">
      <section className="section-card reveal">
        <SectionHeading title="المزيد" subtitle="روابط سريعة" />
        <div className="compact-grid columns-3">
          <Link to="/how-it-works" className="compact-link-card">
            <strong>كيف يعمل</strong>
            <p>دليل جمع النقاط ومستويات المكافآت.</p>
          </Link>
          <Link to="/about" className="compact-link-card">
            <strong>عن كريم فارما</strong>
            <p>نبذة رسمية مختصرة.</p>
          </Link>
          <Link to="/contact" className="compact-link-card">
            <strong>التواصل</strong>
            <p>الفروع ووسائل التواصل الرسمية.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

function AdminPage({ levels, onReloadOffers }) {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState("");
  const [manualPoints, setManualPoints] = useState({
    pharmacyId: "",
    customerCode: "",
    pointsType: "admin",
    description: "",
    points: "",
    referenceId: "",
    source: "admin",
    createdBy: "admin"
  });
  const [offerForm, setOfferForm] = useState(DEFAULT_OFFER_FORM);

  const adminPassword = import.meta.env?.VITE_ADMIN_PASSWORD?.trim();

  const loadAdmin = async () => {
    setLoading(true);
    const rows = await fetchAdminDataset();
    setDataset(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (authorized) loadAdmin().catch((error) => console.error("[Rewards:admin-load]", error));
  }, [authorized]);

  const handleSaveOffer = async (event) => {
    event.preventDefault();
    await saveOffer(offerForm);
    setOfferForm(DEFAULT_OFFER_FORM);
    await loadAdmin();
    await onReloadOffers();
  };

  const filteredLedger = useMemo(() => {
    const rows = dataset?.points_ledger || [];
    return selectedPharmacyId ? rows.filter((row) => row.pharmacy_id === selectedPharmacyId) : rows;
  }, [dataset, selectedPharmacyId]);

  if (!adminPassword) {
    return (
      <div className="page-stack narrow">
        <section className="section-card reveal">
          <SectionHeading title="لوحة الإدارة" subtitle="مقفلة" />
          <EmptyState message="لا يمكن فتح لوحة الإدارة قبل ضبط VITE_ADMIN_PASSWORD." />
        </section>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="page-stack narrow">
        <section className="section-card reveal">
          <SectionHeading title="لوحة الإدارة" subtitle="دخول محمي" />
          <form
            className="lookup-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (password === adminPassword) setAuthorized(true);
            }}
          >
            <input type="password" required placeholder="كلمة مرور الإدارة" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="submit" className="btn btn-primary">
              دخول
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="section-card reveal">
        <SectionHeading title="إدارة برنامج كريم فارما للمكافآت" subtitle={loading ? "جاري تحميل بيانات Supabase..." : "بيانات حية من Supabase"} />
        {!isSupabaseConfigured && <EmptyState message="Supabase غير مهيأ في هذه البيئة." />}
      </section>

      <section className="section-card reveal">
        <SectionHeading title="طلبات التسجيل" subtitle="تحديث الحالة وتصدير CSV" />
        <AdminToolbar rows={dataset?.registration_requests || []} filename="registration_requests.csv" />
        <div className="admin-table">
          {(dataset?.registration_requests || []).map((row) => (
            <div key={row.id} className="admin-row">
              <div>
                <strong>{row.pharmacy_name}</strong>
                <span>{row.contact_name}</span>
                <span>{row.customer_code || "بدون كود عميل"}</span>
              </div>
              <div className="admin-row-actions">
                <select
                  value={row.status || "new"}
                  onChange={async (event) => {
                    await updateRegistrationRequestStatus(row.id, event.target.value);
                    await loadAdmin();
                  }}
                >
                  {["new", "reviewing", "linked", "credentials_sent", "activated", "incomplete"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="الصيدليات" subtitle="اختيار صيدلية وعرض السجل" />
        <AdminToolbar rows={dataset?.pharmacies || []} filename="pharmacies.csv" />
        <select value={selectedPharmacyId} onChange={(event) => setSelectedPharmacyId(event.target.value)} className="admin-select">
          <option value="">كل الصيدليات</option>
          {(dataset?.pharmacies || []).map((row) => (
            <option key={row.id} value={row.id}>
              {row.pharmacy_name}
            </option>
          ))}
        </select>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="دفتر النقاط" subtitle="points_ledger" />
        <AdminToolbar rows={filteredLedger} filename="points_ledger.csv" />
        <div className="ledger-table">
          <div className="ledger-row ledger-head">
            <span>التاريخ</span>
            <span>النوع</span>
            <span>الوصف</span>
            <span>النقاط</span>
            <span>المرجع</span>
          </div>
          {filteredLedger.map((row) => {
            const mapped = {
              transactionDate: row.transaction_date || row.created_at,
              pointsType: row.points_type || row.activity_type || "admin",
              description: row.description || row.notes || "",
              points: row.points,
              referenceId: row.reference_id || row.source_id || ""
            };
            return (
              <div key={row.id} className="ledger-row">
                <span>{formatDate(mapped.transactionDate)}</span>
                <span>{POINT_TYPE_LABELS[mapped.pointsType] || mapped.pointsType}</span>
                <span>{mapped.description || "-"}</span>
                <strong className={Number(mapped.points) < 0 ? "negative" : "positive"}>{mapped.points}</strong>
                <span>{mapped.referenceId || "-"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="إضافة نقاط يدوية" subtitle="سجل جديد في points_ledger" />
        <form
          className="register-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await addManualPointsRecord(manualPoints);
            setManualPoints({
              pharmacyId: "",
              customerCode: "",
              pointsType: "admin",
              description: "",
              points: "",
              referenceId: "",
              source: "admin",
              createdBy: "admin"
            });
            await loadAdmin();
          }}
        >
          <select value={manualPoints.pharmacyId} onChange={(event) => setManualPoints((current) => ({ ...current, pharmacyId: event.target.value }))}>
            <option value="">اختر الصيدلية</option>
            {(dataset?.pharmacies || []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.pharmacy_name}
              </option>
            ))}
          </select>
          <input placeholder="كود العميل" value={manualPoints.customerCode} onChange={(event) => setManualPoints((current) => ({ ...current, customerCode: event.target.value }))} />
          <select value={manualPoints.pointsType} onChange={(event) => setManualPoints((current) => ({ ...current, pointsType: event.target.value }))}>
            {Object.keys(POINT_TYPE_LABELS).map((key) => (
              <option key={key} value={key}>
                {POINT_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
          <input required placeholder="الوصف" value={manualPoints.description} onChange={(event) => setManualPoints((current) => ({ ...current, description: event.target.value }))} />
          <input required type="number" placeholder="النقاط" value={manualPoints.points} onChange={(event) => setManualPoints((current) => ({ ...current, points: event.target.value }))} />
          <input placeholder="المرجع" value={manualPoints.referenceId} onChange={(event) => setManualPoints((current) => ({ ...current, referenceId: event.target.value }))} />
          <button className="btn btn-primary full-width" type="submit">
            إضافة السجل
          </button>
        </form>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="العروض" subtitle="إضافة وتفعيل وتعطيل" />
        <AdminToolbar rows={dataset?.offers || []} filename="offers.csv" />
        <form className="register-form" onSubmit={handleSaveOffer}>
          <input required placeholder="العنوان" value={offerForm.title} onChange={(event) => setOfferForm((current) => ({ ...current, title: event.target.value }))} />
          <input placeholder="وصف مختصر" value={offerForm.shortDescription} onChange={(event) => setOfferForm((current) => ({ ...current, shortDescription: event.target.value }))} />
          <input placeholder="banner_url" value={offerForm.bannerUrl} onChange={(event) => setOfferForm((current) => ({ ...current, bannerUrl: event.target.value }))} />
          <input placeholder="offer_type" value={offerForm.offerType} onChange={(event) => setOfferForm((current) => ({ ...current, offerType: event.target.value }))} />
          <input placeholder="reward_text" value={offerForm.rewardText} onChange={(event) => setOfferForm((current) => ({ ...current, rewardText: event.target.value }))} />
          <input type="number" placeholder="points_reward" value={offerForm.pointsReward} onChange={(event) => setOfferForm((current) => ({ ...current, pointsReward: event.target.value }))} />
          <input placeholder="gift_value" value={offerForm.giftValue} onChange={(event) => setOfferForm((current) => ({ ...current, giftValue: event.target.value }))} />
          <input type="date" value={offerForm.startDate} onChange={(event) => setOfferForm((current) => ({ ...current, startDate: event.target.value }))} />
          <input type="date" value={offerForm.endDate} onChange={(event) => setOfferForm((current) => ({ ...current, endDate: event.target.value }))} />
          <input placeholder="terms" value={offerForm.terms} onChange={(event) => setOfferForm((current) => ({ ...current, terms: event.target.value }))} />
          <input placeholder="whatsapp_message" value={offerForm.whatsappMessage} onChange={(event) => setOfferForm((current) => ({ ...current, whatsappMessage: event.target.value }))} />
          <input type="number" placeholder="sort_order" value={offerForm.sortOrder} onChange={(event) => setOfferForm((current) => ({ ...current, sortOrder: event.target.value }))} />
          <button className="btn btn-primary full-width" type="submit">
            حفظ العرض
          </button>
        </form>
        <div className="offers-grid">
          {(dataset?.offers || []).map((row) => {
            const offer = mapOfferRow(row);
            return (
              <article key={offer.id} className="offer-card admin-offer-card">
                <div className="offer-body">
                  <strong className="offer-value">{offer.rewardText || offer.offerType || "Offer"}</strong>
                  <h3>{offer.title}</h3>
                  <p>{offer.shortDescription}</p>
                  <div className="admin-actions-inline">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setOfferForm({
                        id: offer.id,
                        title: offer.title,
                        shortDescription: offer.shortDescription,
                        bannerUrl: offer.bannerUrl,
                        offerType: offer.offerType,
                        rewardText: offer.rewardText,
                        pointsReward: offer.pointsReward,
                        giftValue: offer.giftValue || "",
                        startDate: offer.startDate || "",
                        endDate: offer.endDate || "",
                        terms: offer.terms,
                        isActive: offer.isActive,
                        whatsappMessage: offer.whatsappMessage || WHATSAPP_DEFAULT_MESSAGE,
                        sortOrder: offer.sortOrder
                      })}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      className="btn btn-tertiary"
                      onClick={async () => {
                        await toggleOfferActiveState(offer.id, offer.isActive);
                        await loadAdmin();
                        await onReloadOffers();
                      }}
                    >
                      {offer.isActive ? "تعطيل" : "تفعيل"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="مستويات المكافآت" subtitle="loyalty_levels" />
        <AdminToolbar rows={levels} filename="loyalty_levels.csv" />
        <div className="compact-grid columns-4">
          {levels.map((level) => (
            <article key={level.id || level.levelName} className="level-tile">
              <strong>{level.levelName}</strong>
              <span>
                {level.minPoints} - {Number.isFinite(level.maxPoints) ? level.maxPoints : "فأكثر"}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card reveal">
        <SectionHeading title="رفع النقاط" subtitle="point_uploads" />
        <AdminToolbar rows={dataset?.point_uploads || []} filename="point_uploads.csv" />
        <EmptyState message="تم تجهيز نموذج البيانات والواجهة. تنفيذ استيراد Excel الفعلي مؤجل للسبرنت القادم." />
      </section>

      <section className="section-card reveal">
        <SectionHeading title="الاستبدالات" subtitle="point_redemptions" />
        <AdminToolbar rows={dataset?.point_redemptions || []} filename="point_redemptions.csv" />
        <div className="compact-grid columns-3">
          {(dataset?.point_redemptions || []).map((row) => (
            <article key={row.id} className="compact-tile redemption">
              <strong>{row.reward_description || row.reward_type || "استبدال"}</strong>
              <p>{row.points_used} نقطة</p>
              <span>{row.status || "-"}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Footer() {
  return (
    <footer className="rewards-footer reveal">
      <div>
        <strong>برنامج كريم فارما للمكافآت</strong>
        <p>منصة رسمية للصيدليات لمتابعة النقاط والعروض والمزايا الناتجة عن التعامل عبر منصة كريم فارما الرقمية.</p>
      </div>
      <div className="footer-links">
        <a href={getWhatsappUrl()} target="_blank" rel="noreferrer">
          واتساب: 01145000445
        </a>
        <Link to="/contact">الفروع والتواصل</Link>
        <Link to="/admin">الإدارة</Link>
      </div>
    </footer>
  );
}

function MobileNav({ points }) {
  return (
    <nav className="mobile-nav" aria-label="التنقل السفلي">
      {MOBILE_NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} className={item.featured ? "featured-tab" : ""}>
          <b>{item.icon}</b>
          <span>{item.label}</span>
          {item.featured && points > 0 && <em className="points-badge">{points > 999 ? "999+" : points}</em>}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminToolbar({ rows, filename }) {
  return (
    <div className="admin-toolbar">
      <span>{rows.length} سجل</span>
      <button type="button" className="btn btn-secondary" onClick={() => exportRowsToCsv(rows, filename)}>
        تصدير CSV
      </button>
    </div>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="section-heading">
      <span>{subtitle}</span>
      <h2>{title}</h2>
    </div>
  );
}

function TrustTile({ title }) {
  return (
    <article className="compact-tile trust">
      <strong>{title}</strong>
    </article>
  );
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="page-stack narrow">
      <section className="section-card reveal">
        <EmptyState message="الصفحة غير متاحة. يمكنك العودة إلى الصفحة الرئيسية أو متابعة نقاطك." />
        <Link className="btn btn-primary" to="/">
          العودة للرئيسية
        </Link>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export default RewardsPlatformApp;
