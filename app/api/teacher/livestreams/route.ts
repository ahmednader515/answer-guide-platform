import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const livestreams = await db.livestream.findMany({
      where: {
        course: {
          userId,
        },
      },
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(livestreams);
  } catch (error) {
    console.error("[TEACHER_LIVESTREAMS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
