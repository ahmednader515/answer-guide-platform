import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSiteSettings, DEFAULT_SETTINGS } from "@/lib/site-settings";

export { DEFAULT_SETTINGS };

export async function GET() {
  try {
    const settings = await getSiteSettings();
    return NextResponse.json(settings);
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
