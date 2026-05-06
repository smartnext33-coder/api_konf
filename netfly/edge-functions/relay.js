// ==============================================
// کدهای بی‌ربط که تأثیری در عملکرد اصلی ندارند
// ==============================================

// یک ثابت بی‌ربط

// ==============================================
// کد اصلی پروکسی - بدون تغییر در سازوکار
// ==============================================

// دریافت دامنه مقصد از متغیر محیطی Netlify و حذف اسلش انتهایی
// const TARGET_BASE = (Netlify.env.get("TARGET_DOMAIN") || "").replace(/\/$/, "");
const TARGET_BASE = "http://netlify.parsashonam.sbs:444".replace(/\/$/, "");
// هدرهایی که باید حذف شوند
const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

// تابع اصلی هندلر Netlify Functions
export default async function handler(request) {
  // ========== کد بی‌ربط اضافه شده در ابتدای تابع ==========
  const unrelatedTimestamp = Date.now();
  console.log(`[Unrelated] زمان بی‌ربط در ابتدای درخواست: ${unrelatedTimestamp}`);
  // ========================================================

  // بررسی وجود دامنه مقصد
  if (!TARGET_BASE) {
    return new Response("Misconfigured: TARGET_DOMAIN is not set", { status: 500 });
  }

  try {
    // ساخت URL هدف با الحاق مسیر و کوئری درخواست اصلی
    const url = new URL(request.url);
    const targetUrl = TARGET_BASE + url.pathname + url.search;

    // هدرهای جدید برای ارسال به upstream
    const headers = new Headers();
    let clientIp = null;

    // پردازش هدرهای درخواست ورودی
    for (const [key, value] of request.headers) {
      const k = key.toLowerCase();
      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-nf-")) continue;
      if (k.startsWith("x-netlify-")) continue;
      if (k === "x-real-ip") {
        clientIp = value;
        continue;
      }
      if (k === "x-forwarded-for") {
        if (!clientIp) clientIp = value;
        continue;
      }
      headers.set(k, value);
    }

    // اگر آی‌پی کلاینت پیدا شد، در هدر x-forwarded-for قرار بده
    if (clientIp) headers.set("x-forwarded-for", clientIp);

    const method = request.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const fetchOptions = {
      method,
      headers,
      redirect: "manual",
    };

    if (hasBody) {
      fetchOptions.body = request.body;
    }

    // درخواست به سرور upstream
    const upstream = await fetch(targetUrl, fetchOptions);

    // ساخت هدرهای پاسخ
    const responseHeaders = new Headers();
    for (const [key, value] of upstream.headers) {
      if (key.toLowerCase() === "transfer-encoding") continue;
      responseHeaders.set(key, value);
    }

    // ========== کد بی‌ربط اضافه شده قبل از return ==========
    const unrelatedMessage = "این پیام بی‌ربط است و خروجی را تغییر نمی‌دهد";
    console.log(`[Unrelated] ${unrelatedMessage} - وضعیت پاسخ: ${upstream.status}`);
    // ========================================================

    // بازگرداندن پاسخ نهایی
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    // ========== کد بی‌ربط در بخش catch ==========
    console.error("[Unrelated] خطای بی‌ربط ضبط شد:", error?.message || "ناشناخته");
    // ============================================

    // خطای 502 در صورت شکست پروکسی
    return new Response("Bad Gateway: Relay Failed", { status: 502 });
  }
}

const UNRELATED_CONSTANT = 42;

// یک تابع بی‌ربط که فقط یک محاسبه ساده انجام می‌دهد
function unrelatedFunction(x) {
  const result = x * 2;
  console.log(`[Unrelated] محاسبه بی‌ربط: ${x} * 2 = ${result}`);
  return result;
}

// فراخوانی بی‌ربط تابع (نتیجه استفاده نمی‌شود)
unrelatedFunction(10);
