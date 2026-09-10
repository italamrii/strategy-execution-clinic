export const UNRESOLVED_MARKER = "[[UNRESOLVED:";

type ContentSeed = {
  slug: string;
  kind: "PAGE" | "SECTION" | "FAQ";
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  sortOrder: number;
  status: "draft" | "published";
};

export const CONTENT_SEEDS: readonly ContentSeed[] = [
  {
    slug: "home.hero",
    kind: "SECTION",
    titleAr: "نبني الاستراتيجية...\nونحوّلها إلى أثر قابل للقياس",
    titleEn: "We build strategy...\nand turn it into measurable impact.",
    bodyAr:
      "عيادة الاستراتيجية والتنفيذ منظومة مهنية تجمع الممارسين في الاستراتيجية والتنفيذ والأداء والتميز والحوكمة ورأس المال البشري والذكاء الاصطناعي. العضوية تُراجع بشرياً، والمساهمة تُوثَّق، والبطاقة الرقمية تُصدر بعد الاعتماد.",
    bodyEn:
      "Strategy & Execution Clinic is a professional community for practitioners in strategy, execution, performance, excellence, governance, human capital, and AI. Membership is human-reviewed, contributions are documented, and the digital card is issued after approval.",
    sortOrder: 10,
    status: "published",
  },
  {
    slug: "about.clinic",
    kind: "PAGE",
    titleAr: "عن العيادة",
    titleEn: "About the Clinic",
    bodyAr: `<p>عيادة الاستراتيجية والتنفيذ مساحة مهنية لمن يعملون على تحويل التوجه إلى تنفيذ قابل للقياس. نجمع الخبرات عبر ثمانية مسارات، ونربط العضوية بالمساهمة والمراجعة والاعتماد الرقمي.</p>
<p><strong>الرسالة.</strong> تمكين الممارسين من بناء اتجاه واضح، وتنفيذ منضبط، وأثر يمكن التحقق منه داخل مؤسساتهم ومجتمعاتهم المهنية.</p>
<p><strong>الرؤية.</strong> مجتمع مهني عربي موثوق يربط الاستراتيجية بالتنفيذ والأداء دون ادعاء شهادات أو اعتمادات غير قائمة على سجلات المنصة.</p>
<p><strong>القيم.</strong> المراجعة البشرية للعضوية، ورفض اعتماد الساعات ذاتياً، والخصوصية في السجلات العامة، والمساهمة العملية بدلاً من الزينة الشكلية.</p>
<p>لا تعرض هذه الصفحة أرقاماً عن الأعضاء أو شركاء أو شهادات اعتماد خارجية؛ ما يظهر علناً هو ما يمكن التحقق منه من سجلات العيادة نفسها.</p>`,
    bodyEn: `<p>Strategy & Execution Clinic is a professional space for people who turn direction into measurable delivery. We convene eight tracks and connect membership with contribution, review, and a digital credential.</p>
<p><strong>Mission.</strong> Help practitioners set a clear direction, execute with discipline, and produce impact that can be verified inside their institutions and professional communities.</p>
<p><strong>Vision.</strong> A trusted Arabic-first professional community that joins strategy, execution, and performance - without claiming certifications or accreditations that the platform does not actually hold.</p>
<p><strong>Values.</strong> Human review of membership, no self-approved volunteer hours, privacy by default on public records, and practical contribution over decorative status.</p>
<p>This page does not invent member counts, partners, or external accreditation. What is shown publicly is what the Clinic's own records can support.</p>`,
    sortOrder: 20,
    status: "published",
  },
  {
    slug: "how.it-works",
    kind: "PAGE",
    titleAr: "كيف تعمل المشاركة",
    titleEn: "How participation works",
    bodyAr: `<ol><li>تعرّف على العيادة والمسارات الثمانية.</li><li>اختر المسار الأنسب لخبرتك.</li><li>قدّم طلب عضوية بمحتوى مهني واضح.</li><li>تراجع الإدارة الطلب، وقد تطلب معلومات إضافية.</li><li>بعد الموافقة تُفعَّل العضوية وتُصدر بطاقة واحدة برقم فريد.</li><li>من مساحة العضو تتابع المساهمات والاستشارات والاجتماعات.</li></ol>
<p>عضوية الخبير والمؤسس تتطلب موافقة صريحة من صلاحية إصدار العضوية. الشارات المرئية لا تمنح صلاحيات.</p>`,
    bodyEn: `<ol><li>Learn about the Clinic and the eight professional tracks.</li><li>Choose the track that matches your practice.</li><li>Submit a membership application with a clear professional case.</li><li>Administrators review the request and may ask for more information.</li><li>On approval, membership is activated and exactly one card is issued with a unique number.</li><li>From the member workspace you continue with contributions, consultations, and meetings.</li></ol>
<p>Expert and founding memberships require explicit issuance authority. Visual badges never grant permissions.</p>`,
    sortOrder: 25,
    status: "published",
  },
  {
    slug: "consultations.public",
    kind: "PAGE",
    titleAr: "الاستشارات المهنية",
    titleEn: "Professional consultations",
    bodyAr: `<p>الاستشارة مسار خاص بين طالب الاستشارة والخبير المعيَّن والإدارة المخوّلة. الرسائل والمرفقات وغرف الاجتماع ليست عامة.</p>
<p>المسار: طلب -> مراجعة -> تعيين خبير -> جدولة لقاء -> تسليم مخرجات -> إكمال وملاحظات.</p>
<p>نطاق الاستشارة مهني وتنظيمي ضمن خبرة المسارات. لا تُعرض أزرار تعمل شكلاً دون تنفيذ فعلي.</p>`,
    bodyEn: `<p>A consultation is a private path among the requester, the assigned expert, and authorized administrators. Messages, attachments, and meeting rooms are not public.</p>
<p>The journey: request -> review -> assign an expert -> schedule a meeting -> deliverables -> completion and feedback.</p>
<p>The scope is professional and institutional within the Clinic tracks. The interface does not show actions that do nothing.</p>`,
    sortOrder: 26,
    status: "published",
  },
  {
    slug: "knowledge.hub",
    kind: "PAGE",
    titleAr: "المعرفة والموارد",
    titleEn: "Knowledge and resources",
    bodyAr: `<p>مكتبة المعرفة تعرض الموارد المنشورة من المسارات والمساهمات المعتمدة. المحتوى يظهر هنا فقط بعد المراجعة عندما يكون معدّاً للنشر.</p>
<p>إذا كانت المكتبة فارغة فذلك لأن الموارد لم تُعتمد بعد، لا لأن الصفحة تجميلية.</p>`,
    bodyEn: `<p>The knowledge library lists published track resources and approved contributions. Items appear only after review when they are ready to publish.</p>
<p>If the library is empty, that is because no resources have been approved yet - not because this page is a placeholder graphic.</p>`,
    sortOrder: 27,
    status: "published",
  },
  {
    slug: "membership.benefits",
    kind: "PAGE",
    titleAr: "العضوية والمزايا",
    titleEn: "Membership and benefits",
    bodyAr: `<p>العضوية اعتماد مهني داخل العيادة وليست شارة للعرض فقط. بعد الموافقة تحصل على رقم عضوية فريد وبطاقة رقمية يمكن التحقق منها، وارتباط بالمسار، ومساحة للمساهمة والاستشارة.</p>
<p>الأهلية تعتمد على نوع العضوية المفتوح للتقديم، ووضوح الخبرة، وارتباط المسار. أنواع المؤسس والشريك والمؤسسي قد تكون بدعوة فقط.</p>
<p>المدة الافتراضية سنة واحدة من الاعتماد ما لم تُضبط سياسة النوع على مدة أخرى أو مدى الحياة لأنواع محددة.</p>`,
    bodyEn: `<p>Membership is a professional record inside the Clinic, not a decorative badge. After approval you receive a unique membership number, a verifiable digital card, a track association, and access to contribution and consultation workspaces.</p>
<p>Eligibility depends on the membership type that is open for applications, the clarity of your experience, and track fit. Founding, partner, and institutional types may be invitation-only.</p>
<p>Default validity is one year from approval unless the type policy is configured otherwise, including lifetime for designated types.</p>`,
    sortOrder: 28,
    status: "published",
  },
  {
    slug: "faq.public",
    kind: "FAQ",
    titleAr: "أسئلة متكررة",
    titleEn: "Frequently asked questions",
    bodyAr: `<p><strong>هل تُعتمد العضوية تلقائياً؟</strong> لا. المراجعة بشرية، وعضوية الخبير والمؤسس تتطلب صلاحية إصدار صريحة.</p>
<p><strong>هل تُرسل رسالة بريد عند الموافقة؟</strong> يُنشأ إشعار داخل الحساب دائماً. يُرسل البريد فقط إذا كانت خدمة البريد التشغيلي مهيأة، وليس عبر رسائل توثيق الدخول.</p>
<p><strong>هل الشارة تمنح صلاحية إدارة؟</strong> لا. الصلاحيات تُمنح من الأدوار على الخادم.</p>
<p><strong>كيف أتواصل دون بريد معلن؟</strong> استخدم نموذج الدعم الداخلي، بما في ذلك استفسارات الخصوصية.</p>`,
    bodyEn: `<p><strong>Is membership approved automatically?</strong> No. Review is human, and expert or founding memberships require explicit issuance authority.</p>
<p><strong>Do I receive email on approval?</strong> An in-app notification is always created. Email is sent only when a real transactional provider is configured - not via sign-in authentication mail.</p>
<p><strong>Does a badge grant admin power?</strong> No. Permissions come from server-side roles.</p>
<p><strong>How do I make contact without a public email?</strong> Use the internal support form, including privacy inquiries.</p>`,
    sortOrder: 29,
    status: "published",
  },
  {
    slug: "legal.privacy",
    kind: "PAGE",
    titleAr: "سياسة الخصوصية",
    titleEn: "Privacy Policy",
    bodyAr: `<p><strong>مسودة إدارية - تتطلب مراجعة قبل النشر النهائي.</strong></p>
<p>تعالج المنصة بيانات الحساب اللازمة لتسجيل الدخول عبر خدمة الهوية المهيأة، وبيانات الطلبات والعضوية والبطاقات والاستشارات والاجتماعات وسجلات التدقيق.</p>
<p>التحقق العام يعرض حداً أدنى من بيانات العضوية: الاسم المهني الظاهر، والنوع، والرقم، والحالة، والمسار عند الاقتضاء. لا يُعرض البريد أو الهاتف أو الملاحظات الإدارية.</p>
<p>[[UNRESOLVED:legal-entity]] الجهة القانونية المالكة للمنصة.</p>
<p>[[UNRESOLVED:retention]] مدة الاحتفاظ التفصيلية لكل فئة بيانات.</p>
<p>للاستفسار عن الخصوصية استخدم نموذج الدعم بفئة الخصوصية.</p>`,
    bodyEn: `<p><strong>Administrative draft - review required before final publication.</strong></p>
<p>The platform processes the account data needed for sign-in through the configured identity service, plus applications, membership, cards, consultations, meetings, and audit records.</p>
<p>Public verification exposes a minimal membership record: visible professional name, type, number, status, and track when applicable. Email, phone, and admin notes are not shown.</p>
<p>[[UNRESOLVED:legal-entity]] Legal entity that operates the platform.</p>
<p>[[UNRESOLVED:retention]] Detailed retention period for each data category.</p>
<p>For privacy inquiries use the support form with the privacy category.</p>`,
    sortOrder: 30,
    status: "draft",
  },
  {
    slug: "legal.terms",
    kind: "PAGE",
    titleAr: "شروط الاستخدام",
    titleEn: "Terms of Use",
    bodyAr: `<p><strong>مسودة إدارية - تتطلب مراجعة قبل النشر النهائي.</strong></p>
<p>باستخدام المنصة توافق على تقديم معلومات مهنية صحيحة، واحترام صلاحيات الوصول، وعدم محاولة الاطلاع على سجلات غير مخوّلة.</p>
<p>[[UNRESOLVED:legal-entity]] الطرف المتعاقد.</p>
<p>[[UNRESOLVED:governing-law]] النظام واجب التطبيق.</p>`,
    bodyEn: `<p><strong>Administrative draft - review required before final publication.</strong></p>
<p>By using the platform you agree to provide accurate professional information, respect access rules, and not attempt to view unauthorized records.</p>
<p>[[UNRESOLVED:legal-entity]] Contracting party.</p>
<p>[[UNRESOLVED:governing-law]] Applicable law.</p>`,
    sortOrder: 40,
    status: "draft",
  },
  {
    slug: "legal.membership",
    kind: "PAGE",
    titleAr: "سياسة العضوية",
    titleEn: "Membership policy",
    bodyAr: `<p><strong>مسودة إدارية - تتطلب مراجعة قبل النشر النهائي.</strong></p>
<p>يُقدَّم الطلب من الحساب، ويُراجع، وقد يُطلب توضيح، ثم يُوافق أو يُرفض. الموافقة تفعّل العضوية وتصدر بطاقة واحدة حتى مع إعادة المحاولة.</p>
<p>التعليق والإلغاء والتجديد تُنفَّذ من صلاحيات الإدارة وتظهر في البطاقة وسجل التدقيق. المدة الافتراضية سنة ما لم يُضبط نوع العضوية بخلاف ذلك.</p>`,
    bodyEn: `<p><strong>Administrative draft - review required before final publication.</strong></p>
<p>An application is submitted from the account, reviewed, possibly returned for more information, then approved or rejected. Approval activates membership and issues one card even if approval is retried.</p>
<p>Suspension, cancellation, and renewal are performed by authorized administrators and are reflected on the card and in the audit trail. Default validity is one year unless the membership type is configured otherwise.</p>`,
    sortOrder: 41,
    status: "draft",
  },
  {
    slug: "legal.conduct",
    kind: "PAGE",
    titleAr: "ميثاق السلوك",
    titleEn: "Community conduct",
    bodyAr: `<p><strong>مسودة إدارية - تتطلب مراجعة قبل النشر النهائي.</strong></p>
<p>المشاركة المهنية محترمة وموثّقة. يُمنع التنمر وإفشاء معلومات الاستشارات الخاصة وانتحال الصفة المهنية. المخالفة قد تؤدي إلى تعليق العضوية وفق صلاحيات الإدارة.</p>`,
    bodyEn: `<p><strong>Administrative draft - review required before final publication.</strong></p>
<p>Participation is professional and documented. Harassment, disclosure of private consultation material, and professional impersonation are not allowed. Violations may lead to membership suspension under administrator authority.</p>`,
    sortOrder: 42,
    status: "draft",
  },
  {
    slug: "legal.consultations",
    kind: "PAGE",
    titleAr: "سرية الاستشارات ونطاقها",
    titleEn: "Consultation confidentiality and scope",
    bodyAr: `<p><strong>مسودة إدارية - تتطلب مراجعة قبل النشر النهائي.</strong></p>
<p>الاستشارة خاصة بالمشاركين المخوّلين. النطاق مهني ضمن المسارات، وليس بديلاً عن رأي قانوني أو مالي ملزم ما لم يُنص على ذلك صراحة في السجل.</p>
<p>[[UNRESOLVED:advice-disclaimer]] حدود المسؤولية المهنية التفصيلية.</p>`,
    bodyEn: `<p><strong>Administrative draft - review required before final publication.</strong></p>
<p>Consultations are private to authorized participants. Scope is professional within the tracks and is not a substitute for binding legal or financial advice unless the record states otherwise.</p>
<p>[[UNRESOLVED:advice-disclaimer]] Detailed professional-liability limits.</p>`,
    sortOrder: 43,
    status: "draft",
  },
  {
    slug: "legal.meetings",
    kind: "PAGE",
    titleAr: "المشاركة في الاجتماعات والتسجيل",
    titleEn: "Meeting participation and recording",
    bodyAr: `<p><strong>مسودة إدارية - تتطلب مراجعة قبل النشر النهائي.</strong></p>
<p>غرف الاجتماع متاحة للمشاركين المدعوين. التسجيل والبث معطّلان في الإعداد الافتراضي لمزوّد الاجتماع الحالي ما لم تُغيَّر التهيئة لاحقاً.</p>
<p>[[UNRESOLVED:recording-policy]] سياسة التسجيل إن تم تفعيلها مستقبلاً.</p>`,
    bodyEn: `<p><strong>Administrative draft - review required before final publication.</strong></p>
<p>Meeting rooms are available to invited participants. Recording and livestreaming are disabled in the current meeting-provider defaults unless configuration is changed later.</p>
<p>[[UNRESOLVED:recording-policy]] Recording policy if enabled in the future.</p>`,
    sortOrder: 44,
    status: "draft",
  },
  {
    slug: "legal.content",
    kind: "PAGE",
    titleAr: "ملكية المحتوى والاستخدام المقبول",
    titleEn: "Content ownership and acceptable use",
    bodyAr: `<p><strong>مسودة إدارية - تتطلب مراجعة قبل النشر النهائي.</strong></p>
<p>تبقى حقوق المساهم في مادته ما لم يُتفق على غير ذلك داخل السجل. يُمنح العيادة ترخيصاً تشغيلياً لعرض المحتوى المعتمد داخل المنصة. يُمنع رفع مواد غير قانونية أو تنتهك خصوصية الآخرين.</p>
<p>[[UNRESOLVED:content-license]] صيغة الترخيص النهائية.</p>`,
    bodyEn: `<p><strong>Administrative draft - review required before final publication.</strong></p>
<p>Contributors retain rights in their material unless the record agrees otherwise. The Clinic receives an operational license to display approved content on the platform. Illegal material and content that violates others' privacy is not allowed.</p>
<p>[[UNRESOLVED:content-license]] Final license wording.</p>`,
    sortOrder: 45,
    status: "draft",
  },
  {
    slug: "contact.info",
    kind: "SECTION",
    titleAr: "الدعم والطلبات",
    titleEn: "Support and requests",
    bodyAr: "لا يُعرض بريد تواصل عام. أرسل طلبك عبر النموذج الداخلي، ويصل إلى الإدارة المخوّلة.",
    bodyEn: "No public contact email is published. Send your request through the internal form; authorized administrators receive it.",
    sortOrder: 50,
    status: "published",
  },
];

export function contentHasUnresolvedFields(bodyAr: string, bodyEn: string) {
  return bodyAr.includes(UNRESOLVED_MARKER) || bodyEn.includes(UNRESOLVED_MARKER);
}
