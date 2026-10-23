# تسليم محرك نَوء

VITE_ENGINE_URL=https://automations-n8n.gkrgfu.easypanel.host/webhook/noo-engine/v1
VITE_SUPABASE_URL=https://xjegeggcsemvytfnvzez.supabase.co
اسم متغير المفتاح العام: VITE_SUPABASE_PUBLISHABLE_KEY. لا تستخدم service_role في المتصفح.

## الجلسة والعقد
أول طلب إلى POST /channels/web/inbound يتضمن request_id UUID وsession:null وclient_nonce عشوائيًا من 64 حرف hex وtype:text وtext. يولد المتصفح nonce بـ crypto.getRandomValues. أعد استخدام request_id وnonce نفسيهما عند إعادة المحاولة. احفظ session:{id,token} المعادة في sessionStorage؛ صلاحيتها 24 ساعة. كل جلسة تنشئ أسرة ديمو مستقلة. لا ترسل household_id.

أرسل الرسائل التالية مع session: موافق، ثم عدد الأسرة، ثم المدينة. كل طلب جديد له request_id جديد. طلب الزر: type:action وaction كما ورد في buttons، بما فيه target_id وversion. لا تُنشئ نسخة زر قديمة.

الصوت: POST /measurements/voice، FormData بحقل audio وmetadata الذي يحتوي JSON للطلب مع type:voice. لا تضبط Content-Type يدويًا. الصيغ المختبرة webm/opus وogg/opus، بحد 10 MiB و90 ثانية. MP4/M4A بصوت AAC-LC مدعومان ومختبران، مع استخراج AAC داخل الذاكرة قبل Gemini.

تقديم الوقت: POST /demo/advance-time مع request_id وsession وdays:2 أو7. يعالج الأيام المتوسطة، ولا يكرر الأثر عند إعادة الطلب نفسه.

اعرض reply_ar مرة واحدة، ثم messages بالترتيب، واعرض card وbuttons. عند error اعرض message_ar، وأعد المحاولة بنفس request_id إذا retryable=true. لا تسجل token في أدوات التحليلات.

## القراءات
POST /forecast أو /nashra مع session يعيد نشرة الأسرة. POST /summary يعيد قياسات آخر30 يومًا. GET /insights/kpis و/funnel و/critical-weeks و/live تعيد مجاميع معنونة بأنها تشمل بيانات تجريبية. لا تستخدمها لإثبات أثر حقيقي.

العقد الكامل: engine-contract.schema.json وopenapi.yaml. النماذج الفعلية للبطاقات في tests/full-story-results.json.


## حالة الربط الحالية
قاعدة الإنتاج الوحيدة هي قاعدة عمر xjegeggcsemvytfnvzez. CORS منشور للنطاق https://nawa-litadoom.vercel.app، واختبار OPTIONS نجح. المحرك وعامل الإرسال ووصلة واتساب منشورة. لم تُنقل بيانات قاعدة أُسيد القديمة.

## تنبيه للواجهة
الموقع الحالي يحتاج تعديل engineAdapter.ts وفق العقد المرفق؛ هذه الحزمة لا تعدّل الواجهة. استخدم base URL أعلاه المنتهي بـ /v1 مع المسارات دون تكرار /v1. لا تستخدم household_id=h_demo في الكتابة. استخرج session من أول رد، وأرسل نفس request_id عند retry ونفس action وversion من الزر. لا تضع التوكن في URL أو logs.

change_pct رقم مئوي موقّع، مثل -62.5. null يعني عدم وجود مقارنة صالحة؛ لا تحوله إلى0، ولا تعرض الزيادة كأنها انخفاض.

الصوت المنشور والمختبر: webm/opus وogg/opus وMP4/M4A بصوت AAC-LC، بما فيه MP4 مجزأ. لم يُجر اختبار جهاز آيفون فعلي. لا تفترض Whisper؛ المزود الفعلي Gemini بالاعتماد الموجود على الخادم.

النشرة الخاصة تقرأ عبر POST /nashra وsession. h_show نشرة تجريبية عامة للقراءة فقط. البث الحي Supabase live_feed على قاعدة عمر؛ اختُبر تأكيد القياس عبر HTTP ثم وصول INSERT إلى اشتراك Supabase Realtime العام وظهوره في v_live. اختبار الواجهة المنشورة كاملة مسؤولية المرحلة الثالثة.

الصادرات في n8n/ منقحة من المفاتيح. لا تعِد استيراد قيم REDACTED كأنها أسرار؛ اربط الاعتمادات الموجودة في الخادم.


## التحقق النهائي
راجع STATUS.md وtests/README.md. التنظيف الفوري وTTL منشوران، وMP4/M4A وRealtime واختبار التسجيل والصوت والتأكيد على واتساب نجحت بعد التحويل إلى قاعدتك. التعليمة FIRST run git pull موجهة لعمر/Claude الذي سيكمل الواجهة. ملفات المشروع المعدلة محصورة في docs/engine/ وn8n/.
