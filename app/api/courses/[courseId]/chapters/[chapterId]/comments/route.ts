import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function hasCourseAccess(userId: string, courseId: string, userRole?: string | null): Promise<boolean> {
  if (userRole === "ADMIN" || userRole === "TEACHER") return true;

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      purchases: { where: { userId, status: "ACTIVE" } },
    },
  });

  if (!course) return false;
  if (course.price === 0 || course.price === null) return true;
  return course.purchases.length > 0;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { courseId, chapterId } = await params;
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const accessible = await hasCourseAccess(userId, courseId, user?.role);
    if (!accessible) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const comments = await db.comment.findMany({
      where: { chapterId, parentId: null },
      include: {
        user: { select: { id: true, fullName: true, image: true, role: true } },
        replies: {
          include: {
            user: { select: { id: true, fullName: true, image: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("[COMMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { courseId, chapterId } = await params;
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const accessible = await hasCourseAccess(userId, courseId, user?.role);
    if (!accessible) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const chapter = await db.chapter.findUnique({
      where: { id: chapterId, courseId },
      select: { commentsEnabled: true },
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    if (!chapter.commentsEnabled) {
      return new NextResponse("Comments are disabled for this chapter", { status: 403 });
    }

    const { content, parentId } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return new NextResponse("Content is required", { status: 400 });
    }

    if (parentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: parentId, chapterId },
      });
      if (!parentComment) {
        return new NextResponse("Parent comment not found", { status: 404 });
      }
    }

    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        chapterId,
        userId,
        parentId: parentId ?? null,
      },
      include: {
        user: { select: { id: true, fullName: true, image: true, role: true } },
        replies: {
          include: {
            user: { select: { id: true, fullName: true, image: true, role: true } },
          },
        },
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("[COMMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
