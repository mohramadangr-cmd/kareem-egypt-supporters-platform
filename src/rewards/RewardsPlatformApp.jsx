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
  { to: "/", label: "الرئيسية", icon: "home" },
  { to: "/offers", label: "العروض", icon: "offers" },
  { to: "/my-points", label: "نقاطي", icon: "points", featured: true },
  { to: "/register", label: "التسجيل", icon: "register" },
  { to: "/more", label: "المزيد", icon: "more" }
];

const HEADER_LINKS = [
  { to: "/offers", label: "العروض" },
  { to: "/my-points", label: "نقاطي" },
  { to: "/register", label: "التسجيل" },
  { to: "/contact", label: "تواصل" }
];

const QUICK_ACTIONS = [
  { to: "/register", label: "التسجيل", icon: "register" },
  { to: "/offers", label: "العروض", icon: "offers" },
  { to: "/how-it-works", label: "كيف يعمل", icon: "spark" },
  { to: "/contact", label: "تواصل معنا", icon: "contact" }
];

const POINT_TYPE_LABELS = {
  welcome: "نقاط ترحيبية",
  online_orders: "نقاط الطلبات",
  offers: "نقاط العروض",
  campaigns: "نقاط الحملات",
  admin: "نقاط إدارية",
  redemption: "نقاط مستبدلة"
};

const OFFER_TYPES = {
  registration: "عرض تسجيل",
  first_order: "أول طلب",
  points_multiplier: "نقاط مضاعفة",
  discount: "خصم",
  free_goods: "بضاعة مجانية",
  reward_balance: "رصيد مكافآت"
};

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

const EMPTY_POINTS_MESSAGE =
  "لا توجد نقاط مسجلة حتى الآن. سيتم تحديث الرصيد بعد تفعيل الحساب أو أول تعامل مؤهل للنقاط.";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  return reduced;
}

function useCountUp(value) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(() => Number(value) || 0);
  const previous = useRef(Number(value) || 0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (reduced) {
      setDisplay(target);
      previous.current = target;
      return undefined;
    }

    let frame = 0;
    let start = 0;
    const from = previous.current;

    const tick = (time) => {
      if (!start) start = time;
      const progress = Math.min((time - start) / 700, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else previous.current = target;
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reduced, value]);

  return display;
}

function AnimatedNumber({ value }) {
  const display = useCountUp(value);
  return <>{display.toLocaleString("en-US")}</>;
}

function RewardsPlatformApp() {
  const [levels, setLevels] = useState(DEFAULT_LEVELS);
  const [offers, setOffers] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(readSelectedPharmacy());
  const [ledger, setLedger] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offersError, setOffersError] = useState("");

  useEffect(() => {
    let active = true;
    const loadPublicData = async () => {
      try {
        const [levelsData, offersData, storedPharmacy] = await Promise.all([
          fetchLoyaltyLevels(),
          fetchActiveOffers(),
          hydrateSelectedPharmacy()
        ]);
        if (!active) return;
        setLevels(levelsData);
        setOffers(offersData);
        setSelectedPharmacy(storedPharmacy || null);
        setOffersError("");
      } catch (error) {
        console.error("[Rewards:public-load]", error);
        if (!active) return;
        setOffersError("تعذر تحميل العروض حالياً.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPublicData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadPharmacyData = async () => {
      if (!selectedPharmacy?.customerCode) {
        setLedger([]);
        setRedemptions([]);
        return;
      }

      try {
        const [ledgerRows, redemptionRows] = await Promise.all([
          fetchLedgerForPharmacy({ pharmacyId: selectedPharmacy.id, customerCode: selectedPharmacy.customerCode }),
          fetchRedemptionsForPharmacy({ pharmacyId: selectedPharmacy.id, customerCode: selectedPharmacy.customerCode })
        ]);
        if (!active) return;
        setLedger(ledgerRows);
        setRedemptions(redemptionRows);
      } catch (error) {
        console.error("[Rewards:pharmacy-load]", error);
        if (!active) return;
        setLedger([]);
        setRedemptions([]);
      }
    };
    loadPharmacyData();
    return () => {
      active = false;
    };
  }, [selectedPharmacy]);

  const summary = useMemo(() => summarizeLedger(ledger, levels), [ledger, levels]);

  const context = {
    loading,
    offers,
    offersError,
    selectedPharmacy,
    setSelectedPharmacy,
    levels,
    ledger,
    redemptions,
    summary,
    reloadOffers: async () => setOffers(await fetchActiveOffers())
  };

  return (
    <div className="rewards-app-shell">
      <main className="app-main-shell">
        <Routes>
          <Route index element={<HomePage context={context} />} />
          <Route path="/my-points" element={<MyPointsPage context={context} />} />
          <Route path="/offers" element={<OffersPage context={context} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage levels={levels} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/admin" element={<AdminPage levels={levels} onReloadOffers={context.reloadOffers} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <MobileBottomNav selectedPharmacy={selectedPharmacy} points={summary.availablePoints} />
    </div>
  );
}

function TopHeader() {
  return (
    <header className="app-header reveal">
      <div className="app-header-row">
        <div className="app-header-brand">
          <Link className="brand-logo-wrap" to="/">
            <img src="/assets/kareem-logo.png" alt="Kareem Pharma" />
          </Link>
          <div className="brand-text">
            <strong>برنامج المكافآت</strong>
            <span>منصة الصيدليات</span>
          </div>
        </div>

        <a className="header-icon-button" href={getWhatsappUrl()} target="_blank" rel="noreferrer" aria-label="واتساب">
          <NavIcon name="whatsapp" />
        </a>
      </div>

      <nav className="desktop-header-links" aria-label="التنقل الرئيسي">
        {HEADER_LINKS.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function HomePage({ context }) {
  const offersPreview = context.offers.slice(0, 3);

  return (
    <div className="screen-stack">
      <TopHeader />

      <section className="app-card welcome-card reveal">
        <div className="welcome-copy">
          <h1>أهلاً بك في كريم فارما</h1>
          <p>اطلب أونلاين واجمع نقاط ومزايا لصيدليتك</p>
        </div>
        <div className="button-row">
          <PrimaryButton as={Link} to="/register">
            سجل الآن
          </PrimaryButton>
          <SecondaryButton as={Link} to="/my-points">
            عرض نقاطي
          </SecondaryButton>
        </div>
      </section>

      <Link to="/my-points" className="app-card wallet-shortcut-card reveal">
        <div className="wallet-shortcut-copy">
          <span className="section-kicker">نقاطي</span>
          <strong>اعرف رصيد صيدليتك وحركات النقاط</strong>
          <small>فتح نقاطي</small>
        </div>
        <div className="wallet-shortcut-icon">
          <NavIcon name="points" />
        </div>
      </Link>

      <section className="quick-actions-grid reveal">
        {QUICK_ACTIONS.map((item) => (
          <Link key={item.to} to={item.to} className="action-tile">
            <span className="action-icon">
              <NavIcon name={item.icon} />
            </span>
            <strong>{item.label}</strong>
          </Link>
        ))}
      </section>

      <section className="section-block reveal">
        <div className="section-title-row">
          <h2>عروض متاحة</h2>
          <Link to="/offers">عرض الكل</Link>
        </div>

        {context.loading ? (
          <EmptyState title="جاري تحميل العروض" body="نقوم الآن بجلب أحدث العروض." />
        ) : context.offersError ? (
          <EmptyState title="تعذر تحميل العروض" body={context.offersError} />
        ) : offersPreview.length ? (
          <div className="offers-preview-row">
            {offersPreview.map((offer) => (
              <OfferCard key={offer.id} offer={offer} compact />
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد عروض نشطة حالياً" body="" />
        )}
      </section>

      <section className="trust-strip reveal">كريم فارما — توزيع دوائي احترافي منذ 2005</section>
    </div>
  );
}

function MyPointsPage({ context }) {
  const [lookup, setLookup] = useState({
    customerCode: context.selectedPharmacy?.customerCode || "",
    whatsapp: context.selectedPharmacy?.whatsapp || ""
  });
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [tab, setTab] = useState("summary");
  const selected = context.selectedPharmacy;
  const progress = levelProgress(context.summary);

  const statCards = [
    { label: "نقاط هذا الشهر", value: context.summary.monthlyPoints },
    { label: "نقاط الطلبات", value: context.summary.categories.onlineOrders },
    { label: "نقاط العروض", value: context.summary.categories.offers },
    { label: "نقاط مستبدلة", value: context.summary.categories.redemption }
  ];

  const rewardItems = [
    { title: "المستوى الحالي", text: context.summary.currentLevel.levelName },
    {
      title: "المتبقي للمستوى التالي",
      text: context.summary.nextLevelGap ? `${context.summary.nextLevelGap} نقطة` : "تم الوصول لأعلى مستوى"
    },
    { title: "آخر حركة", text: context.summary.lastMovement?.description || "لا توجد حركة مسجلة" }
  ];

  const submitLookup = async (event) => {
    event.preventDefault();
    setLookupLoading(true);
    setLookupError("");

    try {
      const pharmacy = await lookupPharmacy(lookup);
      if (!pharmacy) {
        clearSelectedPharmacy();
        context.setSelectedPharmacy(null);
        setLookupError("لم نتمكن من العثور على بيانات الصيدلية. يمكنك طلب التسجيل أو التواصل مع فريق كريم فارما.");
      } else {
        context.setSelectedPharmacy(pharmacy);
      }
    } catch (error) {
      console.error("[Rewards:lookup]", error);
      setLookupError("تعذر تنفيذ البحث حالياً. حاول مرة أخرى.");
    } finally {
      setLookupLoading(false);
    }
  };

  if (!selected) {
    return (
      <div className="screen-stack">
        <TopHeader />

        <section className="app-card lookup-card reveal">
          <div className="lookup-copy">
            <h1>اعرف رصيد نقاط صيدليتك</h1>
            <p>استخدم كود العميل ورقم الواتساب المسجل لدى كريم فارما.</p>
          </div>

          <form className="lookup-form" onSubmit={submitLookup}>
            <FieldInput
              value={lookup.customerCode}
              onChange={(event) => setLookup((current) => ({ ...current, customerCode: event.target.value }))}
              placeholder="كود العميل"
              required
            />
            <FieldInput
              value={lookup.whatsapp}
              onChange={(event) => setLookup((current) => ({ ...current, whatsapp: event.target.value }))}
              placeholder="رقم واتساب"
              required
            />
            {lookupError && <InlineNotice tone="error">{lookupError}</InlineNotice>}
            <div className="button-row stacked-mobile">
              <PrimaryButton type="submit">{lookupLoading ? "جاري البحث..." : "عرض نقاطي"}</PrimaryButton>
              <GhostButton as={Link} to="/register">
                تسجيل صيدلية جديدة
              </GhostButton>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <TopHeader />

      <section className="page-title-card reveal">
        <div>
          <span className="section-kicker">نقاطي</span>
          <h1>أهلاً {selected.pharmacyName}</h1>
        </div>
        <GhostButton
          type="button"
          onClick={() => {
            clearSelectedPharmacy();
            context.setSelectedPharmacy(null);
            setLookup({ customerCode: "", whatsapp: "" });
          }}
        >
          بحث جديد
        </GhostButton>
      </section>

      <section className="balance-wallet-card reveal">
        <div className="balance-wallet-top">
          <div>
            <span className="wallet-label">الرصيد الحالي</span>
            <strong className="wallet-number">
              <AnimatedNumber value={context.summary.availablePoints} />
            </strong>
          </div>
          <span className="level-badge">{context.summary.currentLevel.levelName}</span>
        </div>

        <ProgressBar value={progress} />

        <div className="balance-wallet-meta">
          <span>كود العميل: {selected.customerCode}</span>
          <span>
            {context.summary.nextLevelGap
              ? `${context.summary.nextLevelGap} نقطة للوصول للمستوى التالي`
              : "تم الوصول لأعلى مستوى"}
          </span>
        </div>
      </section>

      <section className="stats-grid reveal">
        {statCards.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </section>

      <section className="section-block reveal">
        <Tabs
          current={tab}
          onChange={setTab}
          items={[
            { id: "summary", label: "ملخص" },
            { id: "transactions", label: "الحركات" },
            { id: "rewards", label: "المكافآت" }
          ]}
        />

        {tab === "summary" && (
          <div className="stats-grid summary-grid-two">
            <StatCard label="نقاط ترحيبية" value={context.summary.categories.welcome} />
            <StatCard label="نقاط الطلبات" value={context.summary.categories.onlineOrders} />
            <StatCard label="نقاط العروض" value={context.summary.categories.offers} />
            <StatCard label="نقاط الحملات" value={context.summary.categories.campaigns} />
          </div>
        )}

        {tab === "transactions" &&
          (context.ledger.length ? (
            <div className="ledger-list">
              {context.ledger.map((item) => (
                <div key={item.id} className="ledger-row">
                  <div className="ledger-row-main">
                    <strong>{item.description || POINT_TYPE_LABELS[item.pointsType] || "حركة نقاط"}</strong>
                    <span>{formatDate(item.transactionDate)}</span>
                  </div>
                  <strong className={item.points < 0 ? "points-negative" : "points-positive"}>
                    {item.points > 0 ? `+${item.points}` : item.points}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="لا توجد حركات حتى الآن" body={EMPTY_POINTS_MESSAGE} />
          ))}

        {tab === "rewards" && (
          <div className="rewards-grid">
            {rewardItems.map((item) => (
              <InfoCard key={item.title} title={item.title} text={item.text} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OffersPage({ context }) {
  return (
    <div className="screen-stack">
      <TopHeader />

      <section className="page-title-card reveal page-title-compact">
        <div>
          <span className="section-kicker">العروض</span>
          <h1>العروض</h1>
          <p>عروض ومزايا مخصصة للصيدليات</p>
        </div>
      </section>

      <section className="section-block reveal">
        {context.loading ? (
          <EmptyState title="جاري تحميل العروض" body="نقوم الآن بجلب أحدث العروض." />
        ) : context.offersError ? (
          <EmptyState title="تعذر تحميل العروض" body={context.offersError} />
        ) : context.offers.length ? (
          <div className="offers-list-grid">
            {context.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد عروض نشطة حالياً" body="" />
        )}
      </section>
    </div>
  );
}

function OfferCard({ offer, compact = false }) {
  const typeLabel = OFFER_TYPES[offer.offerType] || offer.offerType || "عرض";
  const rewardLabel =
    offer.rewardText ||
    (offer.pointsReward ? `${offer.pointsReward} نقطة` : offer.giftValue ? String(offer.giftValue) : "ميزة حصرية");
  const message = offer.whatsappMessage || WHATSAPP_DEFAULT_MESSAGE;

  return (
    <article className={`offer-card ${compact ? "compact" : ""}`}>
      <div className="offer-banner">
        {offer.bannerUrl ? (
          <img src={offer.bannerUrl} alt={offer.title} />
        ) : (
          <div className="offer-banner-fallback">
            <span className="offer-badge">{rewardLabel}</span>
          </div>
        )}
        <span className="offer-badge offer-badge-floating">{rewardLabel}</span>
      </div>
      <div className="offer-content">
        <span className="offer-type-label">{typeLabel}</span>
        <h3>{offer.title}</h3>
        <p>{offer.shortDescription || "عرض مخصص للصيدليات ضمن برنامج كريم فارما للمكافآت."}</p>
        <small>{offer.terms || "تطبق الشروط حسب العرض."}</small>
        <PrimaryButton as="a" href={getWhatsappUrl(message)} target="_blank" rel="noreferrer">
          اطلب العرض
        </PrimaryButton>
      </div>
    </article>
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
          : "ربط Supabase غير متاح في هذه البيئة."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen-stack">
      <TopHeader />
      <section className="section-block reveal narrow-shell">
        <div className="section-title-row single">
          <div>
            <span className="section-kicker">التسجيل</span>
            <h1>طلب تسجيل صيدلية</h1>
          </div>
        </div>

        {success ? (
          <EmptyState
            title="تم استلام طلبك بنجاح."
            body="سيقوم فريق كريم فارما بالتواصل معك لتفعيل الحساب وإرسال بيانات منصة كريم فارما الرقمية."
          />
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <FieldInput required value={form.pharmacyName} onChange={updateField("pharmacyName")} placeholder="اسم الصيدلية" />
            <FieldInput required value={form.contactName} onChange={updateField("contactName")} placeholder="اسم المسؤول" />
            <FieldInput required value={form.whatsapp} onChange={updateField("whatsapp")} placeholder="رقم واتساب" />
            <FieldInput required type="email" value={form.email} onChange={updateField("email")} placeholder="البريد الإلكتروني" />
            <FieldSelect required value={form.governorate} onChange={updateField("governorate")}>
              <option value="">المحافظة</option>
              {GOVERNORATES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </FieldSelect>
            <FieldInput required value={form.address} onChange={updateField("address")} placeholder="العنوان" />
            <FieldSelect value={form.requestType} onChange={updateField("requestType")}>
              <option value="عميل حالي">عميل حالي</option>
              <option value="تكويد جديد">تكويد جديد</option>
            </FieldSelect>
            <FieldInput value={form.customerCode} onChange={updateField("customerCode")} placeholder="كود العميل إن وجد" />
            {errorMessage && <InlineNotice tone="error">{errorMessage}</InlineNotice>}
            <PrimaryButton type="submit">{submitting ? "جاري الإرسال..." : "إرسال الطلب"}</PrimaryButton>
          </form>
        )}
      </section>
    </div>
  );
}

function HowItWorksPage({ levels }) {
  return (
    <div className="screen-stack">
      <TopHeader />
      <section className="section-block reveal">
        <div className="section-title-row single">
          <div>
            <span className="section-kicker">كيف يعمل</span>
            <h1>دليل مختصر</h1>
          </div>
        </div>
        <div className="quick-actions-grid steps-grid-two">
          {[
            { label: "سجل صيدليتك", icon: "register" },
            { label: "فعّل المنصة", icon: "spark" },
            { label: "اطلب أونلاين", icon: "offers" },
            { label: "استفد من العروض", icon: "points" }
          ].map((item) => (
            <div key={item.label} className="action-tile static">
              <span className="action-icon">
                <NavIcon name={item.icon} />
              </span>
              <strong>{item.label}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block reveal">
        <div className="section-title-row single">
          <div>
            <span className="section-kicker">المستويات</span>
            <h2>مستويات المكافآت</h2>
          </div>
        </div>
        <div className="stats-grid summary-grid-two">
          {levels.map((level) => (
            <InfoCard
              key={level.id || level.levelName}
              title={level.levelName}
              text={`${level.minPoints} إلى ${Number.isFinite(level.maxPoints) ? level.maxPoints : "فأكثر"} نقطة`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="screen-stack">
      <TopHeader />
      <section className="section-block reveal">
        <div className="section-title-row single">
          <div>
            <span className="section-kicker">عن كريم فارما</span>
            <h1>ثقة دوائية للصيدليات</h1>
          </div>
        </div>
        <div className="stats-grid summary-grid-two">
          <InfoCard title="تأسست عام 2005" text="شركة مصرية متخصصة في توزيع الأدوية." />
          <InfoCard title="شهادة GSDP" text="جودة التخزين والتوزيع الدوائي." />
          <InfoCard title="توزيع دوائي احترافي" text="خدمة موجهة للصيدليات في أنحاء مصر." />
          <InfoCard title="منصة رقمية للصيدليات" text="طلبات وعروض ومتابعة تعاملات." />
        </div>
      </section>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="screen-stack">
      <TopHeader />
      <section className="section-block reveal">
        <div className="section-title-row single">
          <div>
            <span className="section-kicker">تواصل</span>
            <h1>الفروع والتواصل</h1>
          </div>
        </div>

        <div className="stats-grid summary-grid-two">
          {CONTACT_BRANCHES.map((branch) => (
            <InfoCard key={`${branch.name}-${branch.city}`} title={branch.name} text={branch.city} />
          ))}
        </div>

        <div className="contact-actions">
          <PrimaryButton as="a" href={getWhatsappUrl()} target="_blank" rel="noreferrer">
            واتساب 01145000445
          </PrimaryButton>
          <GhostButton
            as="a"
            href="https://www.facebook.com/KareemPharmaOfficial/"
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </GhostButton>
        </div>
      </section>
    </div>
  );
}

function MorePage() {
  return (
    <div className="screen-stack">
      <TopHeader />
      <section className="section-block reveal">
        <div className="section-title-row single">
          <div>
            <span className="section-kicker">المزيد</span>
            <h1>روابط إضافية</h1>
          </div>
        </div>
        <div className="quick-actions-grid">
          <Link to="/how-it-works" className="action-tile">
            <span className="action-icon">
              <NavIcon name="spark" />
            </span>
            <strong>كيف يعمل</strong>
          </Link>
          <Link to="/about" className="action-tile">
            <span className="action-icon">
              <NavIcon name="contact" />
            </span>
            <strong>عن كريم فارما</strong>
          </Link>
          <Link to="/contact" className="action-tile">
            <span className="action-icon">
              <NavIcon name="contact" />
            </span>
            <strong>تواصل</strong>
          </Link>
          <Link to="/admin" className="action-tile">
            <span className="action-icon">
              <NavIcon name="more" />
            </span>
            <strong>الإدارة</strong>
          </Link>
        </div>
      </section>
    </div>
  );
}

function AdminPage({ levels, onReloadOffers }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState("");
  const [offerForm, setOfferForm] = useState(DEFAULT_OFFER_FORM);
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
  const configuredPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  const loadAdmin = async () => {
    setLoading(true);
    try {
      setDataset(await fetchAdminDataset());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) loadAdmin();
  }, [unlocked]);

  if (!configuredPassword) {
    return (
      <div className="screen-stack">
        <TopHeader />
        <section className="section-block reveal narrow-shell">
          <EmptyState title="لوحة الإدارة مغلقة" body="قم بإعداد VITE_ADMIN_PASSWORD لتفعيل الوصول." />
        </section>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="screen-stack">
        <TopHeader />
        <section className="section-block reveal narrow-shell">
          <div className="section-title-row single">
            <div>
              <span className="section-kicker">الإدارة</span>
              <h1>دخول الإدارة</h1>
            </div>
          </div>
          <form
            className="lookup-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (password === configuredPassword) setUnlocked(true);
            }}
          >
            <FieldInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="كلمة المرور"
              required
            />
            <PrimaryButton type="submit">دخول</PrimaryButton>
          </form>
        </section>
      </div>
    );
  }

  const filteredLedger = (dataset?.points_ledger || []).filter((row) =>
    selectedPharmacyId ? row.pharmacy_id === selectedPharmacyId || row.pharmacyId === selectedPharmacyId : true
  );

  return (
    <div className="screen-stack">
      <TopHeader />

      <section className="section-block reveal">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">الإدارة</span>
            <h1>لوحة البيانات</h1>
          </div>
          <SecondaryButton type="button" onClick={loadAdmin}>
            {loading ? "جاري التحديث..." : "تحديث"}
          </SecondaryButton>
        </div>
      </section>

      <section className="section-block reveal">
        <SectionHead title="طلبات التسجيل" />
        <AdminToolbar rows={dataset?.registration_requests || []} filename="registration_requests.csv" />
        <AdminList>
          {(dataset?.registration_requests || []).map((row) => (
            <AdminRow
              key={row.id}
              title={row.pharmacy_name || row.pharmacyName}
              meta={[row.contact_name || row.contactName, row.whatsapp, row.request_type || row.requestType].filter(Boolean)}
            >
              <FieldSelect
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
              </FieldSelect>
            </AdminRow>
          ))}
        </AdminList>
      </section>

      <section className="section-block reveal">
        <SectionHead title="الصيدليات" />
        <AdminToolbar rows={dataset?.pharmacies || []} filename="pharmacies.csv" />
        <FieldSelect value={selectedPharmacyId} onChange={(event) => setSelectedPharmacyId(event.target.value)}>
          <option value="">كل الصيدليات</option>
          {(dataset?.pharmacies || []).map((row) => (
            <option key={row.id} value={row.id}>
              {row.pharmacy_name}
            </option>
          ))}
        </FieldSelect>
      </section>

      <section className="section-block reveal">
        <SectionHead title="دفتر النقاط" />
        <AdminToolbar rows={filteredLedger} filename="points_ledger.csv" />
        <div className="ledger-list">
          {filteredLedger.map((row) => (
            <div key={row.id} className="ledger-row">
              <div className="ledger-row-main">
                <strong>{row.description || row.notes || "-"}</strong>
                <span>
                  {formatDate(row.transaction_date || row.created_at)} •{" "}
                  {POINT_TYPE_LABELS[row.points_type] || row.points_type || row.activity_type || "admin"}
                </span>
              </div>
              <strong className={Number(row.points) < 0 ? "points-negative" : "points-positive"}>{row.points}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block reveal">
        <SectionHead title="إضافة نقاط يدوية" />
        <form
          className="form-grid"
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
          <FieldSelect value={manualPoints.pharmacyId} onChange={(event) => setManualPoints((current) => ({ ...current, pharmacyId: event.target.value }))}>
            <option value="">اختر الصيدلية</option>
            {(dataset?.pharmacies || []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.pharmacy_name}
              </option>
            ))}
          </FieldSelect>
          <FieldInput value={manualPoints.customerCode} onChange={(event) => setManualPoints((current) => ({ ...current, customerCode: event.target.value }))} placeholder="كود العميل" />
          <FieldSelect value={manualPoints.pointsType} onChange={(event) => setManualPoints((current) => ({ ...current, pointsType: event.target.value }))}>
            {Object.entries(POINT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </FieldSelect>
          <FieldInput required value={manualPoints.description} onChange={(event) => setManualPoints((current) => ({ ...current, description: event.target.value }))} placeholder="الوصف" />
          <FieldInput required type="number" value={manualPoints.points} onChange={(event) => setManualPoints((current) => ({ ...current, points: event.target.value }))} placeholder="النقاط" />
          <FieldInput value={manualPoints.referenceId} onChange={(event) => setManualPoints((current) => ({ ...current, referenceId: event.target.value }))} placeholder="المرجع" />
          <PrimaryButton type="submit">إضافة السجل</PrimaryButton>
        </form>
      </section>

      <section className="section-block reveal">
        <SectionHead title="العروض" />
        <AdminToolbar rows={dataset?.offers || []} filename="offers.csv" />
        <form
          className="form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            await saveOffer(offerForm);
            setOfferForm(DEFAULT_OFFER_FORM);
            await loadAdmin();
            await onReloadOffers();
          }}
        >
          <FieldInput required value={offerForm.title} onChange={(event) => setOfferForm((current) => ({ ...current, title: event.target.value }))} placeholder="العنوان" />
          <FieldInput value={offerForm.shortDescription} onChange={(event) => setOfferForm((current) => ({ ...current, shortDescription: event.target.value }))} placeholder="وصف مختصر" />
          <FieldInput value={offerForm.bannerUrl} onChange={(event) => setOfferForm((current) => ({ ...current, bannerUrl: event.target.value }))} placeholder="banner_url" />
          <FieldInput value={offerForm.offerType} onChange={(event) => setOfferForm((current) => ({ ...current, offerType: event.target.value }))} placeholder="offer_type" />
          <FieldInput value={offerForm.rewardText} onChange={(event) => setOfferForm((current) => ({ ...current, rewardText: event.target.value }))} placeholder="reward_text" />
          <FieldInput type="number" value={offerForm.pointsReward} onChange={(event) => setOfferForm((current) => ({ ...current, pointsReward: event.target.value }))} placeholder="points_reward" />
          <FieldInput value={offerForm.giftValue} onChange={(event) => setOfferForm((current) => ({ ...current, giftValue: event.target.value }))} placeholder="gift_value" />
          <FieldInput type="date" value={offerForm.startDate} onChange={(event) => setOfferForm((current) => ({ ...current, startDate: event.target.value }))} placeholder="start_date" />
          <FieldInput type="date" value={offerForm.endDate} onChange={(event) => setOfferForm((current) => ({ ...current, endDate: event.target.value }))} placeholder="end_date" />
          <FieldInput value={offerForm.terms} onChange={(event) => setOfferForm((current) => ({ ...current, terms: event.target.value }))} placeholder="terms" />
          <FieldInput value={offerForm.whatsappMessage} onChange={(event) => setOfferForm((current) => ({ ...current, whatsappMessage: event.target.value }))} placeholder="whatsapp_message" />
          <FieldInput type="number" value={offerForm.sortOrder} onChange={(event) => setOfferForm((current) => ({ ...current, sortOrder: event.target.value }))} placeholder="sort_order" />
          <PrimaryButton type="submit">حفظ العرض</PrimaryButton>
        </form>

        <div className="offers-list-grid">
          {(dataset?.offers || []).map((row) => {
            const offer = mapOfferRow(row);
            return (
              <div key={offer.id} className="admin-offer-card">
                <div>
                  <strong>{offer.title}</strong>
                  <span>{offer.rewardText || offer.offerType || "Offer"}</span>
                </div>
                <div className="button-row">
                  <SecondaryButton
                    type="button"
                    onClick={() =>
                      setOfferForm({
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
                        terms: offer.terms || "",
                        isActive: offer.isActive,
                        whatsappMessage: offer.whatsappMessage || WHATSAPP_DEFAULT_MESSAGE,
                        sortOrder: offer.sortOrder
                      })
                    }
                  >
                    تعديل
                  </SecondaryButton>
                  <GhostButton
                    type="button"
                    onClick={async () => {
                      await toggleOfferActiveState(offer.id, offer.isActive);
                      await loadAdmin();
                      await onReloadOffers();
                    }}
                  >
                    {offer.isActive ? "تعطيل" : "تفعيل"}
                  </GhostButton>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-block reveal">
        <SectionHead title="المستويات" />
        <AdminToolbar rows={levels} filename="loyalty_levels.csv" />
        <div className="stats-grid summary-grid-two">
          {levels.map((level) => (
            <InfoCard
              key={level.id || level.levelName}
              title={level.levelName}
              text={`${level.minPoints} - ${Number.isFinite(level.maxPoints) ? level.maxPoints : "فأكثر"}`}
            />
          ))}
        </div>
      </section>

      <section className="section-block reveal">
        <SectionHead title="رفع النقاط" />
        <AdminToolbar rows={dataset?.point_uploads || []} filename="point_uploads.csv" />
        <EmptyState title="الواجهة جاهزة" body="تنفيذ استيراد Excel الفعلي مؤجل للسبرنت القادم." />
      </section>

      <section className="section-block reveal">
        <SectionHead title="الاستبدالات" />
        <AdminToolbar rows={dataset?.point_redemptions || []} filename="point_redemptions.csv" />
        <div className="stats-grid summary-grid-two">
          {(dataset?.point_redemptions || []).map((row) => (
            <InfoCard key={row.id} title={row.reward_description || row.reward_type || "استبدال"} text={`${row.points_used} نقطة - ${row.status || "-"}`} />
          ))}
        </div>
      </section>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="screen-stack">
      <TopHeader />
      <section className="section-block reveal narrow-shell">
        <EmptyState title="الصفحة غير متاحة" body="يمكنك العودة إلى الصفحة الرئيسية أو متابعة نقاطك." />
        <PrimaryButton as={Link} to="/">
          العودة للرئيسية
        </PrimaryButton>
      </section>
    </div>
  );
}

function SectionHead({ title }) {
  return (
    <div className="section-title-row single">
      <div>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="progress-track" aria-hidden="true">
      <span className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{typeof value === "number" ? <AnimatedNumber value={value} /> : value}</strong>
    </article>
  );
}

function InfoCard({ title, text }) {
  return (
    <article className="info-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="empty-state-card">
      <strong>{title}</strong>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

function InlineNotice({ children, tone }) {
  return <div className={`inline-notice ${tone || ""}`.trim()}>{children}</div>;
}

function Tabs({ items, current, onChange }) {
  return (
    <div className="tabs-shell" role="tablist" aria-label="تنقل داخلي">
      {items.map((item) => (
        <button key={item.id} type="button" className={current === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function AdminToolbar({ rows, filename }) {
  return (
    <div className="admin-toolbar">
      <span>{rows.length} سجل</span>
      <SecondaryButton type="button" onClick={() => exportRowsToCsv(rows, filename)}>
        تصدير CSV
      </SecondaryButton>
    </div>
  );
}

function AdminList({ children }) {
  return <div className="admin-list">{children}</div>;
}

function AdminRow({ title, meta = [], children }) {
  return (
    <div className="admin-row-card">
      <div className="admin-row-copy">
        <strong>{title}</strong>
        {meta.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="admin-row-control">{children}</div>
    </div>
  );
}

function MobileBottomNav({ selectedPharmacy, points }) {
  return (
    <nav className="bottom-nav-shell" aria-label="التنقل السفلي">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => `bottom-nav-item ${item.featured ? "is-center" : ""} ${isActive ? "active" : ""}`.trim()}
        >
          <span className="bottom-nav-icon">
            <NavIcon name={item.icon} />
          </span>
          <span className="bottom-nav-label">{item.label}</span>
          {item.featured && (points > 0 || selectedPharmacy) ? (
            <em className="center-badge">{points > 0 ? (points > 999 ? "999+" : points) : "رصيد"}</em>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}

function PrimaryButton({ as, children, className = "", ...props }) {
  const Component = as || "button";
  return (
    <Component className={`button button-primary ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

function SecondaryButton({ as, children, className = "", ...props }) {
  const Component = as || "button";
  return (
    <Component className={`button button-secondary ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

function GhostButton({ as, children, className = "", ...props }) {
  const Component = as || "button";
  return (
    <Component className={`button button-ghost ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

function FieldInput(props) {
  return <input className="field-control" {...props} />;
}

function FieldSelect(props) {
  return <select className="field-control" {...props} />;
}

function NavIcon({ name }) {
  const icons = {
    home: <path d="M4 10.8 12 4l8 6.8V20h-5.4v-5.8H9.4V20H4z" />,
    offers: <path d="M6 7h12a2 2 0 0 1 2 2v2a2.4 2.4 0 0 0 0 4.8V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.2a2.4 2.4 0 0 0 0-4.8V9a2 2 0 0 1 2-2Zm2.8 9.4L15.6 9.8M8.8 10.8h.01M15.2 15.2h.01" />,
    points: <path d="M7.5 5.5h9a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16V8a2.5 2.5 0 0 1 2.5-2.5Zm0 4h9m-6.2 4h3.4" />,
    register: <path d="M12 4.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8ZM6.2 18c0-2.8 2.7-4.6 5.8-4.6s5.8 1.8 5.8 4.6V19H6.2zm12.6-9.3h1.8V6.9h1.8v1.8h1.8v1.8h-1.8v1.8h-1.8v-1.8h-1.8z" />,
    more: <path d="M6.5 12a1.5 1.5 0 1 1 0 .1Zm5.5 0a1.5 1.5 0 1 1 0 .1Zm5.5 0a1.5 1.5 0 1 1 0 .1Z" />,
    whatsapp: <path d="M12 4.5a7.4 7.4 0 0 1 6.3 11.2L19.5 20l-4.4-1.1A7.5 7.5 0 1 1 12 4.5Zm-2 3.6c-.2 0-.4.1-.6.4-.3.3-.8 1-.8 2.3s.8 2.6.9 2.8c.1.2 1.6 2.6 4 3.5 1.9.7 2.3.6 2.7.6.4-.1 1.3-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.3-.2-.7-.4s-1.3-.6-1.5-.7c-.2-.1-.4-.1-.5.1l-.6.7c-.1.2-.3.2-.6.1-.3-.2-1.2-.4-2.2-1.3-.8-.7-1.3-1.6-1.4-1.9-.1-.2 0-.4.1-.5l.4-.5.3-.5c.1-.2.1-.3 0-.5l-.7-1.8c-.2-.4-.4-.4-.5-.4Z" />,
    contact: <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zm2.2.3L12 12l5.8-4.2M6.2 16.8h11.6" />,
    spark: <path d="m12 3 1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z" />
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function levelProgress(summary) {
  const currentLevel = summary.currentLevel || DEFAULT_LEVELS[0];
  const currentPoints = Number(summary.availablePoints) || 0;
  const min = Number(currentLevel.minPoints) || 0;
  const max = Number.isFinite(currentLevel.maxPoints) ? Number(currentLevel.maxPoints) : min + 1000;
  const range = Math.max(max - min, 1);
  return Math.max(6, Math.min(100, ((currentPoints - min) / range) * 100));
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export default RewardsPlatformApp;
