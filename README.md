# نواة للصيانة | Nawa Workshop

Standalone Arabic RTL mobile repair workshop manager built with Next.js App Router, TypeScript and Tailwind CSS. All data and workflow state stay in the browser and persist in `localStorage`; there is no API, backend, or database.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build, use `npm run build` then `npm start`.

## Workflow

1. استقبال الأجهزة → تسجيل الجهاز وطباعة نسختي الإيصال مع QR ورمز أمان من أربعة أحرف.
2. طاولات الفنيين → فتح طلب التشخيص بالرمز وصرف القطع المستهلكة من المخزون.
3. الاستقبال → إدخال نتيجة التشخيص والتكلفة، انتظار موافقة العميل، ثم تعيين الطاولة.
4. طاولات الفنيين → فتح الجهاز المعيّن بالرمز وتشغيل مراحل الإصلاح حتى الجاهزية.
5. أمانات التسليم → مطابقة نسختي العميل والفني وإغلاق الطلب عند الاستلام.

إدارة المخزون والطاولات والفريق، وتتبع العملاء متاحة من القائمة الجانبية. بيانات المثال الأولية تقتصر على قطع المخزون والطاولات والفنيين؛ الطلبات الجديدة تُسجل من الاستقبال.

## Local data

The `nawa-workshop` localStorage key stores devices, inventory, desks and staff. Clearing browser storage resets the demo data. QR tracking URLs use `/?track=ORDER_ID` and open the matching tracking view in the same browser profile.
