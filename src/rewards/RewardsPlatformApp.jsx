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
  { to: "/contact", label: "التواصل" }
];

const HOME_FEATURES = [
  { title: "نقاط ترحيبية", text: "رصيد افتتاحي بعد التسجيل والتفعيل." },
  { title: "نقاط على الطلبات", text: "كل طلب مؤهل يضيف إلى رصيد الصيدلية." },
  { title: "عروض حصرية", text: "مزايا مرتبطة بالعروض النشطة." },
  { title: "تفعيل المنصة", text: "بوابة أساسية للطلب والمتابعة." }
];

const START_STEPS = [
  { step: "1", title: "سجل", text: "بيانات الصيدلية والمسؤول." },
  { step: "2", title: "فعّل الحساب", text: "استلم بيانات المنصة الرقمية." },
  { step: "3", title: "اطلب واجمع نقاط", text: "تابع الرصيد مع كل تعامل مؤهل." }
];

const OFFER_TYPES = {
  registration: "عرض تسجيل",
  first_order: "أول طلب",
  points_multiplier: "نقاط مضاعفة",
  discount: "خصم",
  free_goods: "بضاعة مجانية",
  reward_balance: "رصيد مكافآت"
};

const POINT_TYPE_LABELS = {
  welcome: "نقاط ترحيبية",
  online_orders: "نقاط الطلبات",
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
    let startedAt = 0;
    const from = previous.current;

    const tick = (time) => {
      if (!startedAt) startedAt = time;
      const progress = Math.min((time - startedAt) / 700, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      setDisplay(next);
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
      <div className="app-noise" />
      <TopHeader selectedPharmacy={selectedPharmacy} />
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

function TopHeader({ selectedPharmacy }) {
  return (
    <header className="topbar reveal">
      <div className="brand-cluster">
        <Link className="brand-mark" to="/">
          <img src="/assets/kareem-logo.png" alt="Kareem Pharma" />
        </Link>
        <div className="brand-copy">
          <strong>برنامج كريم فارما للمكافآت</strong>
          <span>{selectedPharmacy ? pharmacyGreeting(selectedPharmacy) : "منصة رسمية للصيدليات"}</span>
        </div>
      </div>

      <nav className="header-links" aria-label="التنقل الرئيسي">
        {HEADER_LINKS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <a className="contact-chip" href={getWhatsappUrl()} target="_blank" rel="noreferrer">
        واتساب
      </a>
    </header>
  );
}

function HomePage({ context }) {
  const greeting = context.selectedPharmacy ? pharmacyGreeting(context.selectedPharmacy) : "";
  const offersPreview = context.offers.slice(0, 3);

  return (
    <div className="screen-stack">
      <ScreenSection className="hero-surface reveal">
        <div className="hero-headline">
          {greeting && <PillBadge tone="soft">{greeting}</PillBadge>}
          <h1>برنامج كريم فارما للمكافآت</h1>
          <h2>اطلب أونلاين، اجمع نقاط، واستفد من مزايا حصرية لصيدليتك</h2>
          <p>كل تعامل رقمي مع كريم فارما يمكن أن يتحول إلى نقاط ومزايا قابلة للمتابعة.</p>
        </div>

        <div className="hero-cta-row">
          <PrimaryButton as={Link} to="/register">
            سجل الآن
          </PrimaryButton>
          <SecondaryButton as={Link} to="/my-points">
            نقاطي
          </SecondaryButton>
          <GhostButton as={Link} to="/offers">
            العروض
          </GhostButton>
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader
          eyebrow="نظرة سريعة"
          title="مزايا أساسية"
          note="بطاقات قصيرة وواضحة"
        />
        <div className="overview-grid">
          {HOME_FEATURES.map((item) => (
            <SummaryCard key={item.title} title={item.title} text={item.text} />
          ))}
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="ابدأ الآن" title="3 خطوات فقط" note="مسار بسيط للانطلاق" />
        <div className="steps-grid">
          {START_STEPS.map((item) => (
            <StepCard key={item.step} {...item} />
          ))}
        </div>
      </ScreenSection>

      <ScreenSection className="points-preview-band reveal">
        <SectionHeader eyebrow="نقاطي" title="معاينة سريعة" note="رصيدك وموقعك الحالي" />
        <div className="points-preview-panel">
          <BalanceCard
            compact
            title={greeting || "رصيد النقاط"}
            balance={context.summary.availablePoints}
            level={context.summary.currentLevel.levelName}
            progressText={
              context.summary.nextLevelGap
                ? `${context.summary.nextLevelGap} نقطة للوصول إلى المستوى التالي`
                : "أنت في أعلى مستوى متاح"
            }
          />
          <div className="points-preview-side">
            <MiniState label="آخر حركة" value={context.summary.lastMovement?.description || "لا توجد حركة بعد"} />
            <MiniState label="الرصيد الشهري" value={<AnimatedNumber value={context.summary.monthlyPoints} />} />
            <PrimaryButton as={Link} to="/my-points">
              اعرف رصيد نقاطك
            </PrimaryButton>
          </div>
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="العروض" title="عروض نشطة" note="من Supabase مباشرة" />
        {context.loading ? (
          <EmptyState title="جاري تحميل العروض" body="نقوم الآن بجلب أحدث العروض النشطة." />
        ) : context.offersError ? (
          <EmptyState title="تعذر تحميل العروض" body={context.offersError} />
        ) : offersPreview.length ? (
          <div className="offers-showcase-grid">
            {offersPreview.map((offer) => (
              <OfferCard key={offer.id} offer={offer} greeting={greeting} />
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد عروض نشطة حالياً." body="تابع الصفحة لمعرفة أحدث عروض كريم فارما." />
        )}
      </ScreenSection>

      <ScreenSection className="trust-strip reveal">
        <div className="trust-strip-copy">
          <SectionHeader eyebrow="ثقة" title="كريم فارما" note="شركة توزيع دوائي مصرية تخدم الصيدليات منذ 2005" />
        </div>
        <div className="trust-badges">
          <PillBadge>تأسست عام 2005</PillBadge>
          <PillBadge>شهادة GSDP</PillBadge>
          <PillBadge>توزيع دوائي احترافي</PillBadge>
          <PillBadge>منصة رقمية للصيدليات</PillBadge>
        </div>
      </ScreenSection>
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

  const statCards = [
    { label: "نقاط هذا الشهر", value: context.summary.monthlyPoints },
    { label: "نقاط العروض", value: context.summary.categories.offers },
    { label: "نقاط الطلبات", value: context.summary.categories.onlineOrders },
    { label: "نقاط مستبدلة", value: context.summary.categories.redemption }
  ];

  const rewardItems = [
    { title: "مستوى الصيدلية", text: context.summary.currentLevel.levelName },
    {
      title: "التقدم",
      text: context.summary.nextLevelGap ? `${context.summary.nextLevelGap} نقطة للمستوى التالي` : "مكتمل"
    },
    {
      title: "ميزة المتابعة",
      text: context.summary.lastMovement?.description || "سيظهر آخر تحديث هنا"
    }
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
        <ScreenSection className="lookup-screen reveal narrow-screen">
          <SectionHeader eyebrow="نقاطي" title="عرض رصيد الصيدلية" note="بحث بكود العميل ورقم واتساب" />
          <form className="lookup-panel" onSubmit={submitLookup}>
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
            <PrimaryButton type="submit">{lookupLoading ? "جاري البحث..." : "عرض نقاطي"}</PrimaryButton>
          </form>
        </ScreenSection>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <ScreenSection className="points-screen-header reveal">
        <div className="screen-header-row">
          <div>
            <PillBadge tone="soft">{pharmacyGreeting(selected)}</PillBadge>
            <h1 className="page-display">{pharmacyGreeting(selected)}</h1>
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
        </div>

        <div className="identity-strip">
          <MiniState label="اسم الصيدلية" value={selected.pharmacyName} />
          <MiniState label="كود العميل" value={selected.customerCode} />
          <MiniState label="المحافظة" value={selected.governorate || "غير محددة"} />
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <BalanceCard
          title="الرصيد الحالي"
          balance={context.summary.availablePoints}
          level={context.summary.currentLevel.levelName}
          progressText={
            context.summary.nextLevelGap
              ? `${context.summary.nextLevelGap} نقطة متبقية للمستوى التالي`
              : "أنت في أعلى مستوى متاح"
          }
        />
      </ScreenSection>

      <ScreenSection className="reveal">
        <div className="stats-ribbon">
          {statCards.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <Tabs current={tab} onChange={setTab} items={[
          { id: "summary", label: "ملخص" },
          { id: "transactions", label: "الحركات" },
          { id: "rewards", label: "المكافآت" }
        ]} />

        {tab === "summary" && (
          <div className="summary-grid">
            <StatCard label="نقاط ترحيبية" value={context.summary.categories.welcome} />
            <StatCard label="نقاط الطلبات" value={context.summary.categories.onlineOrders} />
            <StatCard label="نقاط العروض" value={context.summary.categories.offers} />
            <StatCard label="نقاط الحملات" value={context.summary.categories.campaigns} />
          </div>
        )}

        {tab === "transactions" && (
          context.ledger.length ? (
            <div className="ledger-sheet">
              <div className="ledger-sheet-head">
                <span>التاريخ</span>
                <span>النوع</span>
                <span>الوصف</span>
                <span>النقاط</span>
                <span>المرجع</span>
              </div>
              {context.ledger.map((item) => (
                <div key={item.id} className="ledger-sheet-row">
                  <span>{formatDate(item.transactionDate)}</span>
                  <span>{POINT_TYPE_LABELS[item.pointsType] || item.pointsType}</span>
                  <span>{item.description || "-"}</span>
                  <strong className={item.points < 0 ? "points-negative" : "points-positive"}>
                    {item.points > 0 ? `+${item.points}` : item.points}
                  </strong>
                  <span>{item.referenceId || "-"}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="لا توجد حركات بعد" body={EMPTY_POINTS_MESSAGE} />
          )
        )}

        {tab === "rewards" && (
          <div className="rewards-benefits-grid">
            {rewardItems.map((item) => (
              <SummaryCard key={item.title} title={item.title} text={item.text} />
            ))}
          </div>
        )}
      </ScreenSection>
    </div>
  );
}

function OffersPage({ context }) {
  const greeting = context.selectedPharmacy ? pharmacyGreeting(context.selectedPharmacy) : "";

  return (
    <div className="screen-stack">
      <ScreenSection className="offers-hero reveal">
        <div className="offers-hero-copy">
          {greeting && <PillBadge tone="soft">{greeting}</PillBadge>}
          <h1 className="page-display">العروض والحملات</h1>
          <p className="page-lead">عروض نشطة ومزايا قابلة للتفعيل مرتبطة ببرنامج كريم فارما للمكافآت.</p>
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="عروض نشطة" title="اختر العرض المناسب" note="بيانات مباشرة من Supabase" />
        {context.loading ? (
          <EmptyState title="جاري تحميل العروض" body="نقوم الآن بجلب أحدث العروض النشطة." />
        ) : context.offersError ? (
          <EmptyState title="تعذر تحميل العروض" body={context.offersError} />
        ) : context.offers.length ? (
          <div className="offers-page-grid">
            {context.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} greeting={greeting} large />
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد عروض نشطة حالياً." body="تابع الصفحة لمعرفة أحدث عروض كريم فارما." />
        )}
      </ScreenSection>
    </div>
  );
}

function OfferCard({ offer, greeting, large = false }) {
  const typeLabel = OFFER_TYPES[offer.offerType] || offer.offerType || "عرض";
  const rewardLabel =
    offer.rewardText ||
    (offer.pointsReward ? `${offer.pointsReward} نقطة` : offer.giftValue ? String(offer.giftValue) : "ميزة حصرية");
  const message = offer.whatsappMessage || WHATSAPP_DEFAULT_MESSAGE;

  return (
    <article className={`offer-module ${large ? "offer-module-large" : ""}`}>
      <div className="offer-module-banner">
        {offer.bannerUrl ? (
          <img src={offer.bannerUrl} alt={offer.title} />
        ) : (
          <div className="offer-banner-fallback">
            <PillBadge>{typeLabel}</PillBadge>
            <strong>{rewardLabel}</strong>
          </div>
        )}
      </div>
      <div className="offer-module-body">
        <div className="offer-module-topline">
          <PillBadge>{typeLabel}</PillBadge>
          {greeting && <span className="offer-personalization">{greeting}</span>}
        </div>
        <strong className="offer-module-reward">{rewardLabel}</strong>
        <h3>{offer.title}</h3>
        <p>{offer.shortDescription || "عرض مخصص للصيدليات ضمن برنامج كريم فارما للمكافآت."}</p>
        <div className="offer-meta-lines">
          <span>{offer.terms || "تطبق الشروط حسب العرض."}</span>
          <span>{offer.endDate ? `ينتهي ${formatDate(offer.endDate)}` : "متاح حالياً"}</span>
        </div>
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
      <ScreenSection className="narrow-screen reveal">
        <SectionHeader eyebrow="التسجيل" title="طلب تسجيل صيدلية" note="نموذج مختصر" />
        {success ? (
          <EmptyState
            title="تم استلام طلبك بنجاح."
            body="سيقوم فريق كريم فارما بالتواصل معك لتفعيل حسابك وإرسال كود المستخدم وكلمة المرور الخاصة بمنصة كريم فارما الرقمية."
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
      </ScreenSection>
    </div>
  );
}

function HowItWorksPage({ levels }) {
  return (
    <div className="screen-stack">
      <ScreenSection className="reveal">
        <SectionHeader eyebrow="كيف يعمل" title="دليل سريع" note="نسخة مختصرة" />
        <div className="steps-grid">
          {[
            { step: "1", title: "سجل صيدليتك", text: "ابدأ ببيانات الصيدلية." },
            { step: "2", title: "فعّل المنصة", text: "استلم بيانات الدخول." },
            { step: "3", title: "اطلب أونلاين", text: "كل طلب مؤهل يضيف نقاطاً." },
            { step: "4", title: "استفد من العروض", text: "تابع العروض حسب النشاط." }
          ].map((item) => (
            <StepCard key={item.step} {...item} />
          ))}
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="المستويات" title="مستويات المكافآت" note="حسب إجمالي النقاط" />
        <div className="overview-grid">
          {levels.map((level) => (
            <SummaryCard
              key={level.id || level.levelName}
              title={level.levelName}
              text={`${level.minPoints} إلى ${Number.isFinite(level.maxPoints) ? level.maxPoints : "فأكثر"} نقطة`}
            />
          ))}
        </div>
      </ScreenSection>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="screen-stack">
      <ScreenSection className="reveal">
        <SectionHeader eyebrow="عن كريم فارما" title="ثقة دوائية وخدمة للصيدليات" note="نبذة رسمية" />
        <div className="copy-stack">
          <p>كريم فارما شركة مصرية متخصصة في توزيع الأدوية تأسست عام 2005.</p>
          <p>تُعد واحدة من أكبر شركات توزيع الأدوية في مصر، وحاصلة على شهادة GSDP الخاصة بجودة التخزين والتوزيع الدوائي.</p>
          <p>يرأسها د. رفاعي ربيع رئيس لجنة الموزعين بالشعبة العامة للأدوية.</p>
          <p>هدفنا تقديم خدمة توزيع احترافية تساعد الصيدليات على النمو وتحقيق أفضل تجربة شراء.</p>
        </div>
      </ScreenSection>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="screen-stack">
      <ScreenSection className="reveal">
        <SectionHeader eyebrow="التواصل" title="الفروع ووسائل التواصل" note="معلومات رسمية" />
        <div className="overview-grid">
          {CONTACT_BRANCHES.map((branch) => (
            <SummaryCard key={branch} title={branch} text="فرع كريم فارما" />
          ))}
        </div>
        <div className="hero-cta-row">
          <PrimaryButton as="a" href={getWhatsappUrl()} target="_blank" rel="noreferrer">
            واتساب
          </PrimaryButton>
          <SecondaryButton as="a" href="https://www.facebook.com/KareemPharmaOfficial/" target="_blank" rel="noreferrer">
            Facebook
          </SecondaryButton>
        </div>
      </ScreenSection>
    </div>
  );
}

function MorePage() {
  return (
    <div className="screen-stack">
      <ScreenSection className="reveal">
        <SectionHeader eyebrow="المزيد" title="روابط سريعة" note="وصول مباشر" />
        <div className="overview-grid">
          <CompactLinkCard to="/how-it-works" title="كيف يعمل" text="دليل جمع النقاط" />
          <CompactLinkCard to="/about" title="عن كريم فارما" text="نبذة مختصرة" />
          <CompactLinkCard to="/contact" title="التواصل" text="الفروع والوسائل الرسمية" />
          <CompactLinkCard to="/admin" title="الإدارة" text="لوحة الإدارة" />
        </div>
      </ScreenSection>
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
    try {
      setDataset(await fetchAdminDataset());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) loadAdmin().catch((error) => console.error("[Rewards:admin-load]", error));
  }, [authorized]);

  const filteredLedger = useMemo(() => {
    const rows = dataset?.points_ledger || [];
    return selectedPharmacyId ? rows.filter((row) => row.pharmacy_id === selectedPharmacyId) : rows;
  }, [dataset, selectedPharmacyId]);

  if (!adminPassword) {
    return (
      <div className="screen-stack">
        <ScreenSection className="narrow-screen reveal">
          <EmptyState title="لوحة الإدارة مقفلة" body="لا يمكن فتح لوحة الإدارة قبل ضبط VITE_ADMIN_PASSWORD." />
        </ScreenSection>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="screen-stack">
        <ScreenSection className="narrow-screen reveal">
          <SectionHeader eyebrow="الإدارة" title="دخول محمي" note="كلمة مرور الإدارة" />
          <form
            className="lookup-panel"
            onSubmit={(event) => {
              event.preventDefault();
              if (password === adminPassword) setAuthorized(true);
            }}
          >
            <FieldInput required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة مرور الإدارة" />
            <PrimaryButton type="submit">دخول</PrimaryButton>
          </form>
        </ScreenSection>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <ScreenSection className="reveal">
        <SectionHeader
          eyebrow="الإدارة"
          title="إدارة برنامج كريم فارما للمكافآت"
          note={loading ? "جاري تحميل بيانات Supabase..." : "بيانات حية من Supabase"}
        />
        {!isSupabaseConfigured && <InlineNotice tone="error">Supabase غير مهيأ في هذه البيئة.</InlineNotice>}
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="طلبات التسجيل" title="الحالات" note="تحديث مباشر" />
        <AdminToolbar rows={dataset?.registration_requests || []} filename="registration_requests.csv" />
        <AdminList>
          {(dataset?.registration_requests || []).map((row) => (
            <AdminRow key={row.id} title={row.pharmacy_name} meta={[row.contact_name, row.customer_code || "بدون كود عميل"]}>
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
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="الصيدليات" title="اختيار السجل" note="عرض دفتر النقاط" />
        <AdminToolbar rows={dataset?.pharmacies || []} filename="pharmacies.csv" />
        <FieldSelect value={selectedPharmacyId} onChange={(event) => setSelectedPharmacyId(event.target.value)}>
          <option value="">كل الصيدليات</option>
          {(dataset?.pharmacies || []).map((row) => (
            <option key={row.id} value={row.id}>
              {row.pharmacy_name}
            </option>
          ))}
        </FieldSelect>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="دفتر النقاط" title="points_ledger" note="المصدر الأساسي" />
        <AdminToolbar rows={filteredLedger} filename="points_ledger.csv" />
        <div className="ledger-sheet">
          <div className="ledger-sheet-head">
            <span>التاريخ</span>
            <span>النوع</span>
            <span>الوصف</span>
            <span>النقاط</span>
            <span>المرجع</span>
          </div>
          {filteredLedger.map((row) => (
            <div key={row.id} className="ledger-sheet-row">
              <span>{formatDate(row.transaction_date || row.created_at)}</span>
              <span>{POINT_TYPE_LABELS[row.points_type] || row.points_type || row.activity_type || "admin"}</span>
              <span>{row.description || row.notes || "-"}</span>
              <strong className={Number(row.points) < 0 ? "points-negative" : "points-positive"}>{row.points}</strong>
              <span>{row.reference_id || row.source_id || "-"}</span>
            </div>
          ))}
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="إضافة يدوية" title="سجل نقاط جديد" note="إداري" />
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
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="العروض" title="إضافة وتعديل" note="حفظ مباشر في Supabase" />
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

        <div className="offers-showcase-grid">
          {(dataset?.offers || []).map((row) => {
            const offer = mapOfferRow(row);
            return (
              <article key={offer.id} className="admin-offer-mini">
                <div className="admin-offer-mini-copy">
                  <strong>{offer.title}</strong>
                  <span>{offer.rewardText || offer.offerType || "Offer"}</span>
                </div>
                <div className="admin-actions-cluster">
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
              </article>
            );
          })}
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="المستويات" title="loyalty_levels" note="الترتيب الحالي" />
        <AdminToolbar rows={levels} filename="loyalty_levels.csv" />
        <div className="overview-grid">
          {levels.map((level) => (
            <SummaryCard
              key={level.id || level.levelName}
              title={level.levelName}
              text={`${level.minPoints} - ${Number.isFinite(level.maxPoints) ? level.maxPoints : "فأكثر"}`}
            />
          ))}
        </div>
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="رفع النقاط" title="point_uploads" note="جاهز للسبرنت القادم" />
        <AdminToolbar rows={dataset?.point_uploads || []} filename="point_uploads.csv" />
        <EmptyState title="الواجهة جاهزة" body="تنفيذ استيراد Excel الفعلي مؤجل للسبرنت القادم." />
      </ScreenSection>

      <ScreenSection className="reveal">
        <SectionHeader eyebrow="الاستبدالات" title="point_redemptions" note="عرض السجلات" />
        <AdminToolbar rows={dataset?.point_redemptions || []} filename="point_redemptions.csv" />
        <div className="overview-grid">
          {(dataset?.point_redemptions || []).map((row) => (
            <SummaryCard key={row.id} title={row.reward_description || row.reward_type || "استبدال"} text={`${row.points_used} نقطة - ${row.status || "-"}`} />
          ))}
        </div>
      </ScreenSection>
    </div>
  );
}

function ScreenSection({ children, className = "" }) {
  return <section className={`surface-panel ${className}`.trim()}>{children}</section>;
}

function SectionHeader({ eyebrow, title, note }) {
  return (
    <div className="section-head">
      <PillBadge tone="soft">{eyebrow}</PillBadge>
      <div>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
    </div>
  );
}

function BalanceCard({ title, balance, level, progressText, compact = false }) {
  return (
    <article className={`balance-hero-card ${compact ? "compact" : ""}`}>
      <div className="balance-copy">
        <span>{title}</span>
        <strong className="balance-total">
          <AnimatedNumber value={balance} />
        </strong>
      </div>
      <div className="balance-meta">
        <MiniState label="المستوى الحالي" value={level} />
        <MiniState label="التقدم" value={progressText} />
      </div>
    </article>
  );
}

function SummaryCard({ title, text }) {
  return (
    <article className="summary-module">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function StepCard({ step, title, text }) {
  return (
    <article className="step-module">
      <b>{step}</b>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-module">
      <span>{label}</span>
      <strong>{typeof value === "number" ? <AnimatedNumber value={value} /> : value}</strong>
    </article>
  );
}

function MiniState({ label, value }) {
  return (
    <div className="mini-state">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="empty-module">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function InlineNotice({ children, tone }) {
  return <div className={`inline-notice ${tone || ""}`.trim()}>{children}</div>;
}

function CompactLinkCard({ to, title, text }) {
  return (
    <Link to={to} className="summary-module link-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </Link>
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

function Tabs({ items, current, onChange }) {
  return (
    <div className="tabs-shell" role="tablist" aria-label="التنقل الداخلي">
      {items.map((item) => (
        <button key={item.id} type="button" className={current === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
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
          className={({ isActive }) =>
            `bottom-nav-item ${item.featured ? "center-tab" : ""} ${isActive ? "active" : ""}`.trim()
          }
        >
          <span className="bottom-nav-icon">
            <NavIcon name={item.icon} />
          </span>
          <span className="bottom-nav-label">{item.label}</span>
          {item.featured && (points > 0 || selectedPharmacy) && (
            <em className="bottom-nav-badge">{points > 0 ? (points > 999 ? "999+" : points) : "رصيدك"}</em>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function PrimaryButton({ as, children, className = "", ...props }) {
  const Component = as || "button";
  return (
    <Component className={`btn-core btn-primary-core ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

function SecondaryButton({ as, children, className = "", ...props }) {
  const Component = as || "button";
  return (
    <Component className={`btn-core btn-secondary-core ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

function GhostButton({ as, children, className = "", ...props }) {
  const Component = as || "button";
  return (
    <Component className={`btn-core btn-ghost-core ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}

function FieldInput(props) {
  return <input className="field-core" {...props} />;
}

function FieldSelect(props) {
  return <select className="field-core" {...props} />;
}

function PillBadge({ children, tone }) {
  return <span className={`pill-core ${tone === "soft" ? "soft" : ""}`.trim()}>{children}</span>;
}

function NavIcon({ name }) {
  const icons = {
    home: (
      <path d="M4 11.8 12 5l8 6.8v8.2h-5.2v-5.3H9.2V20H4z" />
    ),
    offers: (
      <path d="M6 7h12a2 2 0 0 1 2 2v2.2a2.5 2.5 0 0 0 0 4.6V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.2a2.5 2.5 0 0 0 0-4.6V9a2 2 0 0 1 2-2Zm3.2 3.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm5.6 3.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM8.6 17l6.8-6.1" />
    ),
    points: (
      <path d="M12 3.8a5.2 5.2 0 0 1 5.2 5.2c0 1.2-.4 2.3-1.1 3.1l-.3.4V16a1 1 0 0 1-.4.8l-3 2.3a1 1 0 0 1-1.2 0l-3-2.3A1 1 0 0 1 7.8 16v-3.5l-.3-.4A5.2 5.2 0 0 1 12 3.8Zm0 3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z" />
    ),
    register: (
      <path d="M12 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm-6 13.4c0-3 2.9-4.9 6-4.9s6 1.9 6 4.9V19H6zm11.2-8.2h2V7.5h2.2v2.2h2.1V12h-2.1v2.2H19.2V12h-2z" />
    ),
    more: (
      <path d="M6.5 12a1.7 1.7 0 1 1 0 .1Zm5.5 0a1.7 1.7 0 1 1 0 .1Zm5.5 0a1.7 1.7 0 1 1 0 .1Z" />
    )
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function pharmacyGreeting(pharmacy) {
  if (!pharmacy) return "";
  if (pharmacy.contactName) return `أهلاً د/ ${pharmacy.contactName} - ${pharmacy.pharmacyName}`;
  return `أهلاً ${pharmacy.pharmacyName}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function NotFoundPage() {
  return (
    <div className="screen-stack">
      <ScreenSection className="narrow-screen reveal">
        <EmptyState title="الصفحة غير متاحة" body="يمكنك العودة إلى الصفحة الرئيسية أو متابعة نقاطك من الأسفل." />
        <PrimaryButton as={Link} to="/">
          العودة للرئيسية
        </PrimaryButton>
      </ScreenSection>
    </div>
  );
}

export default RewardsPlatformApp;
