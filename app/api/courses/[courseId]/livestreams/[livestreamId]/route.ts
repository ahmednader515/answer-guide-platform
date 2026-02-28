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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; livestreamId: string }> }
) {
  try {
    const { userId } = await auth();
    const { courseId, livestreamId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const livestream = await db.livestream.findUnique({
      where: { id: livestreamId, courseId },
    });

    if (!livestream) {
      return new NextResponse("Not found", { status: 404 });
    }

    return NextResponse.json(livestream);
  } catch (error) {
    console.error("[LIVESTREAM_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
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

    const values = await req.json();

    const updateData: Record<string, unknown> = {};
    if (values.title !== undefined) updateData.title = values.title;
    if (values.description !== undefined) updateData.description = values.description || null;
    if (values.meetingLink !== undefined) updateData.meetingLink = values.meetingLink;
    if (values.scheduledAt !== undefined) updateData.scheduledAt = new Date(values.scheduledAt);
    if (values.expiresAt !== undefined) updateData.expiresAt = new Date(values.expiresAt);
    if (values.isPublished !== undefined) updateData.isPublished = values.isPublished;

    const livestream = await db.livestream.update({
      where: { id: livestreamId, courseId },
      data: updateData,
    });

    return NextResponse.json(livestream);
  } catch (error) {
    console.error("[LIVESTREAM_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
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

    await db.livestream.delete({
      where: { id: livestreamId, courseId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[LIVESTREAM_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
