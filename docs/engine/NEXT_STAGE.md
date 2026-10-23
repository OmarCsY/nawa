# ربط واجهات عمر — المرحلة الثالثة

1. FIRST run git pull to get docs/engine/ and n8n/. Stop and tell the owner if docs/engine is missing. هذه التعليمة لعمر أو Claude داخل مشروع الواجهة بعد رفع هذه الحزمة.
2. اضبط VITE_ENGINE_URL على أصل /webhook/noo-engine/v1، وSupabase على xjegeggcsemvytfnvzez. استخدم المفتاح العام فقط.
3. عدّل engineAdapter.ts ليبدأ session:null + client_nonce آمنًا، ويحفظ session في sessionStorage؛ لا ترسل h_demo. أعد نفس request_id عند retry.
4. استخدم أفعال buttons كما وردت بمعرّف الهدف والإصدار. اعرض reply_ar ثم messages بالترتيب مع البطاقات، دون تكرار.
5. ارفع الصوت FormData إلى /measurements/voice: audio وmetadata JSON؛ يدعم WebM/Opus وOgg/Opus وMP4/M4A AAC-LC. لا تضبط Content-Type يدويًا.
6. حمّل نشرة الزائر عبر POST /nashra مع session. change_pct مئوي موقّع؛ null يعني عدم كفاية المقارنة.
7. طابق /docs مع openapi.yaml، واختبر رحلة المتصفح المنشورة والصوت على آيفون فعلي وRealtime في اللوحة.
8. لا تعدّل تدفقات الإنتاج أو الاعتمادات باستيراد REDACTED. تسجيل واتساب الأصلي للشرائح منفصل عن عرض أدلة HTTP الموجود في التسليم.
