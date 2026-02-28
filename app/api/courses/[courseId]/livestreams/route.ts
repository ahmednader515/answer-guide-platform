import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

async function isCourseOwnerOrAdmin(userId: string, courseId: string, userRole?: string | null): Promise<boolean> {
  if (userRole === "ADMIN") return true;

  const course = await db.course.findUnique({
    where: { id: courseId, userId },
  });

  return !!course;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const canManage = await isCourseOwnerOrAdmin(userId, courseId, user?.role);
    if (!canManage) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { title, description, meetingLink, scheduledAt, expiresAt } = await req.json();

    if (!title || !meetingLink || !scheduledAt || !expiresAt) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const lastLivestream = await db.livestream.findFirst({
      where: { courseId },
      orderBy: { position: "desc" },
    });

    const position = lastLivestream ? lastLivestream.position + 1 : 1;

    const livestream = await db.livestream.create({
      data: {
        title,
        description: description || null,
        meetingLink,
        scheduledAt: new Date(scheduledAt),
        expiresAt: new Date(expiresAt),
        position,
        courseId,
      },
    });

    return NextResponse.json(livestream);
  } catch (error) {
    console.error("[LIVESTREAMS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
