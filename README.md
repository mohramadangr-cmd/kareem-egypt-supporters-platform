# Kareem Pharma Egypt Supporters Platform

منصة عربية RTL لحملة تشجيع منتخب مصر من كريم فارما، مبنية باستخدام React وVite.

## التشغيل المحلي

```bash
npm install
npm run dev
```

لبناء نسخة الإنتاج:

```bash
npm run build
```

## النشر على Netlify

1. اربط مستودع GitHub من لوحة Netlify.
2. استخدم أمر البناء `npm run build`.
3. استخدم مجلد النشر `dist`.
4. ملف `public/_redirects` موجود لدعم مسارات React Router.

## التخصيص

- الأصول الأصلية موجودة في `public/assets/`.
- رقم واتساب قابل للتعديل في `src/config/campaign.js`.
- العروض قابلة للتعديل في `src/data/offers.json`.
- المباريات الرسمية تتم مزامنتها من واجهة FIFA الرسمية إلى `src/data/fixtures.json` عبر:

```bash
npm run sync:fixtures
```

مصدر البيانات: `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023`

## بيانات العرض التجريبي

يحفظ الإصدار الحالي التوقعات ولفات عجلة الحظ والنتائج المحلية في `localStorage`. الصفحة المخفية `/admin-demo` تعرض البيانات وتصدر ملفات CSV وتسمح بتعديل النتائج محليًا.

## التكامل المستقبلي

- `src/services/supabaseClient.js`: نقطة البداية لنقل التخزين إلى Supabase.
- `src/services/notifications.js`: نقطة البداية لإضافة Firebase Cloud Messaging وتنبيهات المباريات.
