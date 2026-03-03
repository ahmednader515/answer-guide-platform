import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Default content used when no DB settings exist
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
};

export async function GET() {
  try {
    const settings = await db.siteSettings.findFirst();
    if (!settings) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }
    return NextResponse.json(settings.content);
  } catch (error) {
    console.error("[SITE_SETTINGS_GET]", error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const role = session.user.role as string;
    if (role !== "ADMIN" && role !== "TEACHER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();

    const existing = await db.siteSettings.findFirst();

    const currentContent = (existing?.content as object) ?? DEFAULT_SETTINGS;
    const merged = { ...currentContent, ...body };

    let updated;
    if (existing) {
      updated = await db.siteSettings.update({
        where: { id: existing.id },
        data: { content: merged },
      });
    } else {
      updated = await db.siteSettings.create({
        data: { content: merged },
      });
    }

    return NextResponse.json(updated.content);
  } catch (error) {
    console.error("[SITE_SETTINGS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
