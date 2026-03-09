import { db } from "@/lib/db";

export const DEFAULT_SETTINGS = {
  teacherName: { ar: "منصة دليل الإجابة", en: "Answer Guide Platform" },
  tagline: { ar: "طوّر لغتك... طوّر مستقبلك", en: "Develop your language... Develop your future" },
  teacherImageUrl: "",
  logoUrl: "",
  facebookUrl: "https://www.facebook.com/mohammed.elhetimy?rdid=bUJIFBhaBf8cShjz&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1Ao3YCvEkQ%2F#",
  whatsappUrl: "https://wa.me/201005224432",
  testimonials: [
    { id: "1", name: "عصام اسامة", grade: "الصف الأول الثانوي", text: "تجربة رائعة مع الأستاذ محمد الهتيمي، شرح مميز وطريقة سهلة في توصيل المعلومة" },
    { id: "2", name: "سيف طارق", grade: "الصف الثاني الثانوي", text: "المنهج منظم جداً والشرح واضح، ساعدني في فهم المواد بشكل أفضل" },
    { id: "3", name: "عمر جمال", grade: "الصف الأول الثانوي", text: "أفضل منصة تعليمية استخدمتها، المحتوى غني والشرح مبسط" },
  ],
  features: [
    { id: "1", title: { ar: "جودة عالية", en: "High Quality" }, description: { ar: "أفضل منصة متخصصة في مواد اللغات", en: "The best specialized platform for language courses" } },
    { id: "2", title: { ar: "مجتمع نشط", en: "Active Community" }, description: { ar: "انضم لمجتمع من الطلاب المتميزين", en: "Join a community of active, outstanding students" } },
    { id: "3", title: { ar: "شهادات تقدير", en: "Certificates of Appreciation" }, description: { ar: "احصل على شهادات تقدير عند إتمام الكورسات", en: "Get certificates of appreciation when you complete courses" } },
  ],
  ctaTitle: { ar: "ابدأ رحلتك التعليمية معنا", en: "Start Your Learning Journey With Us" },
  ctaSubtitle: { ar: "انضم إلينا اليوم وابدأ رحلتك نحو النجاح", en: "Join us today and start your journey to success" },
} as const;

export type SiteSettingsContent = typeof DEFAULT_SETTINGS;

export async function getSiteSettings(): Promise<SiteSettingsContent> {
  try {
    const row = await db.siteSettings.findFirst();
    if (!row?.content) return DEFAULT_SETTINGS as SiteSettingsContent;
    return { ...DEFAULT_SETTINGS, ...(row.content as object) } as SiteSettingsContent;
  } catch (error) {
    console.error("[getSiteSettings]", error);
    return DEFAULT_SETTINGS as SiteSettingsContent;
  }
}
