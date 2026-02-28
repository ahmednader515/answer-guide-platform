import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string; commentId: string }> }
) {
  try {
    const { courseId, chapterId, commentId } = await params;
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const comment = await db.comment.findUnique({
      where: { id: commentId, chapterId },
    });

    if (!comment) {
      return new NextResponse("Comment not found", { status: 404 });
    }

    const isAdmin = user?.role === "ADMIN";

    const isTeacher =
      user?.role === "TEACHER" &&
      (await db.course.findFirst({
        where: { id: courseId, userId },
      })) !== null;

    const isOwner = comment.userId === userId;

    if (!isAdmin && !isTeacher && !isOwner) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await db.comment.delete({ where: { id: commentId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[COMMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
