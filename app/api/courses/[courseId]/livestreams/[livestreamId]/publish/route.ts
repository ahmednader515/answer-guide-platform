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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string; livestreamId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const { courseId, livestreamId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const canManage = await isCourseOwnerOrAdmin(userId, courseId, user?.role);
    if (!canManage) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const livestream = await db.livestream.findUnique({
      where: { id: livestreamId, courseId },
    });

    if (!livestream) {
      return new NextResponse("Not found", { status: 404 });
    }

    const updated = await db.livestream.update({
      where: { id: livestreamId, courseId },
      data: { isPublished: !livestream.isPublished },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[LIVESTREAM_PUBLISH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
