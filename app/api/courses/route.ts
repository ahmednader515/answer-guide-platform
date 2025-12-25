import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        const { title } = await req.json();

        if(!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.create({
            data: {
                userId,
                title,
            }
        });

        return NextResponse.json(course);

    } catch (error) {
        console.log("[Courses]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeProgress = searchParams.get('includeProgress') === 'true';
    
    // Try to get user, but don't fail if not authenticated
    let userId = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (error) {
      // User is not authenticated, which is fine for the home page
      console.log("User not authenticated, showing courses without progress");
    }

    const courses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        user: true,
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        quizzes: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        purchases: includeProgress && userId ? {
          where: {
            userId: userId,
            status: "ACTIVE"
          }
        } : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (includeProgress && userId) {
      // Batch fetch all progress data to avoid N+1 queries
      const allChapterIds = courses.flatMap((course: any) => (course.chapters || []).map((ch: any) => ch.id));
      const allQuizIds = courses.flatMap((course: any) => (course.quizzes || []).map((q: any) => q.id));

      const [allUserProgress, allQuizResults] = await Promise.all([
        allChapterIds.length > 0 ? db.userProgress.findMany({
          where: {
            userId,
            chapterId: { in: allChapterIds },
            isCompleted: true
          },
          select: {
            chapterId: true
          }
        }) : Promise.resolve([]),
        allQuizIds.length > 0 ? db.quizResult.findMany({
          where: {
            studentId: userId,
            quizId: { in: allQuizIds }
          },
          select: {
            quizId: true
          }
        }) : Promise.resolve([])
      ]);

      // Create maps for O(1) lookup
      const completedChaptersSet = new Set(allUserProgress.map(up => up.chapterId));
      const completedQuizzesSet = new Set(allQuizResults.map(qr => qr.quizId));

      // Calculate progress for each course using the batched data
      const coursesWithProgress = courses.map((course: any) => {
        const totalChapters = (course.chapters || []).length;
        const totalQuizzes = (course.quizzes || []).length;
        const totalContent = totalChapters + totalQuizzes;

        let completedChapters = 0;
        let completedQuizzes = 0;

        if (course.purchases && course.purchases.length > 0) {
          // Count completed chapters for this course
          completedChapters = (course.chapters || []).filter((ch: any) => completedChaptersSet.has(ch.id)).length;
          
          // Count unique completed quizzes for this course
          completedQuizzes = (course.quizzes || []).filter((q: any) => completedQuizzesSet.has(q.id)).length;
        }

        const completedContent = completedChapters + completedQuizzes;
        const progress = totalContent > 0 ? (completedContent / totalContent) * 100 : 0;

        return {
          ...course,
          progress
        };
      });

      return NextResponse.json(coursesWithProgress);
    }

    // For unauthenticated users, return courses without progress
    const coursesWithoutProgress = courses.map(course => ({
      ...course,
      progress: 0
    }));

    return NextResponse.json(coursesWithoutProgress);
  } catch (error) {
    console.log("[COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}