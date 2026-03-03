import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  const resolvedParams = await params;
  const { courseId, chapterId } = resolvedParams;

  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const now = new Date();

    // Get chapter with course info
    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
        courseId: courseId,
      },
      include: {
        course: {
          include: {
            purchases: {
              where: {
                userId,
                status: "ACTIVE"
              },
            },
          },
        },
      },
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // Free chapters are always accessible
    if (chapter.isFree) {
      return NextResponse.json({ hasAccess: true });
    }

    const accessDurationDays = chapter.course.accessDurationDays ?? 7;

    // Classify each purchase as active or expired
    const hasCourseAccess = chapter.course.purchases.some((purchase) => {
      if (accessDurationDays === 0) return true; // 0 = unlimited
      const expiresAt = new Date(
        purchase.createdAt.getTime() + accessDurationDays * 24 * 60 * 60 * 1000
      );
      return expiresAt > now;
    });

    const hasExpiredPurchase = !hasCourseAccess && chapter.course.purchases.some((purchase) => {
      if (accessDurationDays === 0) return false;
      const expiresAt = new Date(
        purchase.createdAt.getTime() + accessDurationDays * 24 * 60 * 60 * 1000
      );
      return expiresAt <= now;
    });

    // Check if user has an explicit chapter-level access record
    const chapterAccess = await db.chapterAccess.findUnique({
      where: {
        userId_chapterId: {
          userId: userId,
          chapterId: chapterId,
        },
      },
    });

    const hasChapterAccess = !!chapterAccess;

    // Explicit chapter access always wins (teacher-granted, independent of purchase expiry)
    if (hasChapterAccess) {
      return NextResponse.json({ hasAccess: true });
    }

    // Active course purchase
    if (hasCourseAccess) {
      // Check if chapter-level control is in use for this student
      const courseChapterAccesses = await db.chapterAccess.findMany({
        where: {
          userId: userId,
          chapter: { courseId: courseId },
        },
        select: { chapterId: true },
      });

      if (courseChapterAccesses.length > 0) {
        // Chapter-level control: only explicitly-granted chapters are accessible
        return NextResponse.json({
          hasAccess: false,
          reason: "chapter_not_granted",
        });
      }

      // Full course access, no chapter restrictions
      return NextResponse.json({ hasAccess: true });
    }

    // No active purchase — return appropriate reason
    return NextResponse.json({
      hasAccess: false,
      reason: hasExpiredPurchase ? "course_expired" : "course_not_purchased",
    });

  } catch (error) {
    console.error("[CHAPTER_ACCESS]", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
