export const loyaltyGovernorates = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "القليوبية",
  "الشرقية",
  "الدقهلية",
  "الغربية",
  "المنوفية",
  "البحيرة",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "أسوان",
  "السويس"
];

export const loyaltyLevels = [
  { name: "برونزي", min: 0, max: 999 },
  { name: "فضي", min: 1000, max: 2999 },
  { name: "ذهبي", min: 3000, max: 6999 },
  { name: "بلاتيني", min: 7000, max: Infinity }
];

export const sampleBranches = [
  "الإدارة العامة: الدقي",
  "كرداسة: الجيزة",
  "عين شمس: القاهرة",
  "وسط البلد: السيدة زينب",
  "الإسكندرية",
  "السويس"
];

export const sampleOffers = [
  {
    id: "offer-registration",
    title: "سجل الآن في منصة كريم فارما الرقمية",
    shortDescription: "احصل على رصيد مكافآت ترحيبي حتى 5000 جنيه وفق شروط البرنامج.",
    bannerImage: "linear-gradient(135deg, #163a63, #f08b24)",
    offerType: "رصيد مكافآت",
    pointsReward: 5000,
    giftValue: "حتى 5000 جنيه",
    startDate: "2026-06-01",
    endDate: "2026-07-31",
    terms: "يطبق العرض على الصيدليات المستوفية لشروط التسجيل والتفعيل.",
    active: true,
    whatsappCTA: "السلام عليكم، أرغب في الاستفادة من عروض برنامج كريم فارما للمكافآت."
  },
  {
    id: "offer-first-order",
    title: "أول طلب أونلاين",
    shortDescription: "احصل على نقاط إضافية عند تنفيذ أول طلب من منصة كريم فارما الرقمية.",
    bannerImage: "linear-gradient(135deg, #0f4f6b, #6ec3d4)",
    offerType: "نقاط إضافية",
    pointsReward: 300,
    giftValue: "300 نقطة",
    startDate: "2026-06-10",
    endDate: "2026-08-15",
    terms: "مرة واحدة لكل صيدلية بعد تفعيل الحساب الرقمي.",
    active: true,
    whatsappCTA: "السلام عليكم، أرغب في الاستفادة من عروض برنامج كريم فارما للمكافآت."
  },
  {
    id: "offer-double-points",
    title: "نقاط مضاعفة على عروض الشهر",
    shortDescription: "اجمع نقاطًا مضاعفة على الأصناف المشاركة في الحملة.",
    bannerImage: "linear-gradient(135deg, #244768, #ffffff)",
    offerType: "نقاط مضاعفة",
    pointsReward: 2,
    giftValue: "2x نقاط",
    startDate: "2026-06-15",
    endDate: "2026-06-30",
    terms: "تطبق على الأصناف المعلنة خلال فترة العرض فقط.",
    active: true,
    whatsappCTA: "السلام عليكم، أرغب في الاستفادة من عروض برنامج كريم فارما للمكافآت."
  }
];

export const sampleRegistrationRequests = [
  {
    id: "req-1001",
    pharmacyName: "صيدلية النور",
    contactName: "د. أحمد علاء",
    whatsapp: "01002500025",
    email: "elnour@example.com",
    governorate: "الجيزة",
    address: "الهرم، الجيزة",
    requestType: "عميل حالي",
    customerCode: "10025",
    status: "تم إرسال بيانات الدخول",
    notes: "تمت مراجعة البيانات والتواصل الأولي.",
    createdAt: "2026-06-12T10:00:00.000Z",
    updatedAt: "2026-06-14T13:30:00.000Z"
  },
  {
    id: "req-1002",
    pharmacyName: "صيدلية الشفاء",
    contactName: "د. هبة سامح",
    whatsapp: "01005550011",
    email: "alshifa@example.com",
    governorate: "القاهرة",
    address: "عين شمس، القاهرة",
    requestType: "تكويد جديد",
    customerCode: "",
    status: "جاري المراجعة",
    notes: "في انتظار استكمال بيانات العنوان.",
    createdAt: "2026-06-13T09:15:00.000Z",
    updatedAt: "2026-06-13T09:15:00.000Z"
  }
];

export const samplePharmacies = [
  {
    id: "ph-10025",
    pharmacyName: "صيدلية النور",
    customerCode: "10025",
    governorate: "الجيزة",
    registrationStatus: "مكتمل",
    activationStatus: "مفعل",
    pointsBalance: 2450
  },
  {
    id: "ph-10031",
    pharmacyName: "صيدلية الرواد",
    customerCode: "10031",
    governorate: "القاهرة",
    registrationStatus: "جاري المراجعة",
    activationStatus: "بانتظار التفعيل",
    pointsBalance: 920
  },
  {
    id: "ph-10044",
    pharmacyName: "صيدلية العائلة",
    customerCode: "10044",
    governorate: "الإسكندرية",
    registrationStatus: "مكتمل",
    activationStatus: "مفعل",
    pointsBalance: 3710
  }
];

export const sampleLedger = [
  { id: "led-1", date: "2026-06-01", type: "نقاط ترحيبية", description: "التسجيل في برنامج المكافآت", points: 100, reference: "REG-10025" },
  { id: "led-2", date: "2026-06-02", type: "تفعيل المنصة الرقمية", description: "تفعيل حساب الصيدلية", points: 200, reference: "ACT-10025" },
  { id: "led-3", date: "2026-06-05", type: "طلب أونلاين", description: "طلب رقم 58421", points: 50, reference: "ORD-58421" },
  { id: "led-4", date: "2026-06-09", type: "عرض", description: "شراء أصناف مشاركة في عرض يونيو", points: 120, reference: "OFF-JUN-11" },
  { id: "led-5", date: "2026-06-11", type: "نقاط الطلبات الأونلاين", description: "مجموعة طلبات الأسبوع الأول", points: 1450, reference: "ORD-W1-10025" },
  { id: "led-6", date: "2026-06-13", type: "نقاط الحملات", description: "حملة دعم التفعيل الرقمي", points: 250, reference: "CMP-ONB-1" },
  { id: "led-7", date: "2026-06-14", type: "عرض", description: "رصيد إضافي ضمن عرض الشهر", points: 480, reference: "OFF-JUN-23" },
  { id: "led-8", date: "2026-06-15", type: "استبدال", description: "استخدام نقاط في خصم", points: -100, reference: "RED-10025-1" }
];

export const samplePointsRules = [
  { id: "rule-registration", label: "registration points", title: "نقاط التسجيل", value: "100 نقطة" },
  { id: "rule-activation", label: "activation points", title: "نقاط التفعيل", value: "200 نقطة" },
  { id: "rule-first-order", label: "first order points", title: "أول طلب أونلاين", value: "300 نقطة" },
  { id: "rule-online-order", label: "online order points", title: "كل طلب أونلاين", value: "50 نقطة" },
  { id: "rule-orders-bonus", label: "10 orders bonus", title: "مكافأة 10 طلبات", value: "500 نقطة" },
  { id: "rule-product", label: "product-specific rules", title: "قواعد الأصناف المحددة", value: "حسب الحملة" },
  { id: "rule-offer", label: "offer-specific rules", title: "قواعد العروض", value: "حسب شروط العرض" }
];

export const sampleUploadPreview = {
  filename: "june-points-upload.xlsx",
  uploadedAt: "2026-06-15T09:30:00.000Z",
  totalRows: 120,
  validRows: 112,
  duplicateRows: 5,
  errorRows: 3,
  totalPoints: 14100,
  status: "ready_to_import",
  rows: [
    { customerCode: "10025", referenceId: "ORD-58421", points: 50, status: "valid" },
    { customerCode: "10031", referenceId: "ORD-60021", points: 50, status: "valid" },
    { customerCode: "10044", referenceId: "ORD-60021", points: 50, status: "duplicate" },
    { customerCode: "", referenceId: "ORD-60040", points: 50, status: "error" }
  ]
};

export const sampleRedemptions = [
  { id: "red-1", pharmacy: "صيدلية النور", status: "approved", pointsUsed: 100, rewardGiven: "خصم على فاتورة", date: "2026-06-15" },
  { id: "red-2", pharmacy: "صيدلية الرواد", status: "pending", pointsUsed: 250, rewardGiven: "رصيد مكافآت", date: "2026-06-14" },
  { id: "red-3", pharmacy: "صيدلية العائلة", status: "rejected", pointsUsed: 300, rewardGiven: "بضاعة مجانية", date: "2026-06-11" }
];
