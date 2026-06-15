import React, { useMemo, useState } from "react";
import "./preview-v2.css";

const assets = {
  logo: "/assets/kareem-logo.png",
  cheerBox: "/assets/cheer-box.png",
  flag: "/assets/egypt-flag.png",
};

const quickCards = [
  { label: "تسجيل الصيدلية", value: "100 نقطة" },
  { label: "توقع مباراة", value: "10 نقاط" },
  { label: "عجلة الحظ يوميًا", value: "5 نقاط" },
  { label: "10 طلبات من التطبيق", value: "دخول السحب الكبير" },
];

const dashboardStats = [
  { label: "رصيدك الحالي", value: "320 نقطة", tone: "primary" },
  { label: "ترتيبك", value: "24", tone: "navy" },
  { label: "توقعاتك", value: "6", tone: "green" },
  { label: "لفات العجلة", value: "3", tone: "orange" },
  { label: "طلبات التطبيق", value: "4 / 10", tone: "blue" },
];

const nextActions = [
  { title: "توقع مباريات اليوم", meta: "+10 نقاط لكل توقع", marker: "توقع" },
  { title: "لف عجلة الحظ اليومية", meta: "+5 نقاط مشاركة", marker: "حظ" },
  { title: "جرّب تطبيق كريم فارما", meta: "+100 نقطة اهتمام", marker: "تطبيق" },
  { title: "شوف عروض البطولة", meta: "عروض للصيدليات", marker: "عرض" },
];

const compactSections = [
  { title: "التوقعات المفتوحة", text: "مباريات متاحة الآن لتجميع نقاط توقع جديدة.", accent: "points" },
  { title: "عجلة الحظ", text: "لفة يومية واضحة بجوائز نقاط ومكافآت للصيدليات.", accent: "wheel" },
  { title: "بوكس التشجيع", text: "هدية حملة مرتبطة بأفضل الصيدليات في النقاط.", accent: "box" },
  { title: "تطبيق كريم فارما", text: "طلبات التطبيق تقرب صيدليتك من السحب الكبير.", accent: "app" },
  { title: "جوائز الحملة", text: "أفضل 5 صيدليات وسحوبات التطبيق والمباريات الكبرى.", accent: "prize" },
  { title: "من هي كريم فارما؟", text: "شركة توزيع أدوية مصرية تخدم الصيدليات منذ 2005.", accent: "trust" },
];

function getInitialState() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("state") === "registered";
}

export default function PreviewV2() {
  const [registered, setRegistered] = useState(getInitialState);
  const heroMode = registered ? "v2-hero v2-hero-dashboard" : "v2-hero";
  const progress = useMemo(() => Math.round((4 / 10) * 100), []);

  return (
    <div className="v2-page" dir="ltr">
      <header className="v2-topbar" dir="rtl" aria-label="واجهة تجربة الإصدار الثاني">
        <a className="v2-brand" href="/preview-v2" aria-label="كريم فارما">
          <img src={assets.logo} alt="Kareem Pharma" />
          <span>حملة الصيدليات</span>
        </a>

        <div className="v2-state-switch" aria-label="تبديل حالة العرض">
          <button className={!registered ? "is-active" : ""} type="button" onClick={() => setRegistered(false)}>
            قبل التسجيل
          </button>
          <button className={registered ? "is-active" : ""} type="button" onClick={() => setRegistered(true)}>
            بعد التسجيل
          </button>
        </div>
      </header>

      <main className="v2-shell" dir="rtl">
        <section className={heroMode}>
          <div className="v2-hero-copy">
            <img className="v2-hero-logo" src={assets.logo} alt="Kareem Pharma" />
            <p className="v2-kicker">للصيدليات فقط أثناء كأس العالم</p>
            <h1>
              <span>دوري الصيدليات</span>
              <span>مع كريم فارما</span>
            </h1>
            <p className="v2-subtitle">
              <span>شجع مصر، اجمع نقاط،</span>
              <span>واكسب مع كريم فارما</span>
            </p>
            <p className="v2-lede">
              {registered
                ? "تابع رصيد صيدليتك، اختار أفضل خطوة لزيادة النقاط، واستخدم تطبيق كريم فارما للوصول للسحب الكبير."
                : "سجل صيدليتك وخد 100 نقطة فورًا. توقع المباريات، لف عجلة الحظ، واستخدم تطبيق كريم فارما لدخول السحوبات."}
            </p>

            {!registered ? (
              <div className="v2-hero-actions">
                <button className="v2-btn v2-btn-primary" type="button">سجل صيدليتك وخد 100 نقطة</button>
                <button className="v2-btn v2-btn-secondary" type="button">اعرف نظام النقاط</button>
              </div>
            ) : (
              <div className="v2-greeting-card">
                <span>أهلاً صيدلية النور</span>
                <strong>رصيدك جاهز للحركة التالية</strong>
              </div>
            )}
          </div>

          <aside className="v2-campaign-visual" aria-label="بوكس التشجيع وتطبيق كريم فارما">
            <div className="v2-flag-chip">
              <img src={assets.flag} alt="" />
              <span>تشجيع مصر بطابع الصيدليات</span>
            </div>
            <img className="v2-cheer-box" src={assets.cheerBox} alt="بوكس التشجيع من كريم فارما" />
            <div className="v2-visual-caption">
              <span>إطلاق التطبيق</span>
              <strong>نقاط + سحوبات + طلبات</strong>
            </div>
          </aside>
        </section>

        {!registered ? (
          <section className="v2-quick-grid" aria-label="قواعد النقاط السريعة">
            {quickCards.map((item) => (
              <article className="v2-quick-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </section>
        ) : (
          <>
            <section className="v2-dashboard" aria-label="لوحة صيدلية النور">
              {dashboardStats.map((stat) => (
                <article className={`v2-stat-card is-${stat.tone}`} key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  {stat.label === "طلبات التطبيق" && (
                    <div className="v2-progress" aria-label="تقدم طلبات التطبيق">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </article>
              ))}
            </section>

            <section className="v2-action-zone" aria-label="زود نقاطك الآن">
              <div className="v2-section-head">
                <p>الخطوة التالية</p>
                <h2>زوّد نقاطك الآن</h2>
              </div>
              <div className="v2-action-grid">
                {nextActions.map((action) => (
                  <button className="v2-action-card" type="button" key={action.title}>
                    <span>{action.marker}</span>
                    <strong>{action.title}</strong>
                    <small>{action.meta}</small>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="v2-app-band" aria-label="تطبيق كريم فارما">
          <div>
            <p>حملة إطلاق تطبيق كريم فارما للصيدليات أثناء كأس العالم</p>
            <h2>استخدم التطبيق، زوّد طلباتك، واقرب من السحب الكبير</h2>
          </div>
          <div className="v2-app-metrics">
            <span>أول طلب = 200 نقطة</span>
            <span>كل طلب = 50 نقطة</span>
            <span>10 طلبات = السحب الكبير</span>
          </div>
        </section>

        {registered && (
          <section className="v2-compact-sections" aria-label="أقسام الحملة">
            {compactSections.map((section) => (
              <article className={`v2-mini-section is-${section.accent}`} key={section.title}>
                <span />
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
