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

    // Check if user has course-level access (full course purchase)
    const hasCourseAccess = chapter.course.purchases.length > 0;

    // Check if user has chapter-level access
    const chapterAccess = await db.chapterAccess.findUnique({
      where: {
        userId_chapterId: {
          userId: userId,
          chapterId: chapterId,
        },
      },
    });

    const hasChapterAccess = !!chapterAccess;

    // Check if there are any chapter access records for this course (indicates chapter-level control is being used)
    const courseChapterAccesses = await db.chapterAccess.findMany({
      where: {
        userId: userId,
        chapter: {
          courseId: courseId,
        },
      },
      select: {
        chapterId: true,
      },
    });

    // If student has course access AND there are chapter access records, use chapter-level control
    if (hasCourseAccess && courseChapterAccesses.length > 0) {
      // Only accessible if there's explicit chapter access
      return NextResponse.json({ 
        hasAccess: hasChapterAccess,
        reason: hasChapterAccess ? null : "chapter_not_granted"
      });
    }

    // If student has course access but no chapter access records exist, grant access (backward compatibility)
    if (hasCourseAccess) {
      return NextResponse.json({ hasAccess: true });
    }

    // Without course access, only accessible if there's explicit chapter access
    return NextResponse.json({ 
      hasAccess: hasChapterAccess,
      reason: hasChapterAccess ? null : (hasCourseAccess ? "chapter_not_granted" : "course_not_purchased")
    });
  } catch (error) {
    console.error("[CHAPTER_ACCESS]", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

