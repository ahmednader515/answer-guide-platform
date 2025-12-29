import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getDashboardUrlByRole } from "@/lib/utils";
import { DashboardContent } from "./_components/dashboard-content";
import { Course, Purchase, Chapter } from "@prisma/client";

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  purchases: Purchase[];
  progress: number;
}

type LastWatchedChapter = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  courseImageUrl: string | null;
  position: number;
}

type StudentStats = {
  totalCourses: number;
  totalChapters: number;
  completedChapters: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
}

const CoursesPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirect("/");
  }

  // Redirect non-students to their role-specific dashboard
  if (session.user.role !== "USER") {
    const dashboardUrl = getDashboardUrlByRole(session.user.role);
    return redirect(dashboardUrl);
  }

  // Get user's current balance and verify user exists
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true }
  });

  // If user doesn't exist in database, automatically logout
  if (!user) {
    redirect("/api/auth/signout?callbackUrl=/sign-in");
  }

  // Get last watched chapter
  const lastWatchedChapter = await db.userProgress.findFirst({
    where: {
      userId: session.user.id,
      isCompleted: false // Get the last incomplete chapter
    },
    include: {
      chapter: {
        include: {
          course: {
            select: {
              title: true,
              imageUrl: true
            }
          }
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  // Get student statistics
  const totalCourses = await db.purchase.count({
    where: {
      userId: session.user.id,
      status: "ACTIVE"
    }
  });

  const totalChapters = await db.userProgress.count({
    where: {
      userId: session.user.id
    }
  });

  const completedChapters = await db.userProgress.count({
    where: {
      userId: session.user.id,
      isCompleted: true
    }
  });

  // Get total quizzes from courses the student has purchased
  const totalQuizzes = await db.quiz.count({
    where: {
      course: {
        purchases: {
          some: {
            userId: session.user.id,
            status: "ACTIVE"
          }
        }
      },
      isPublished: true
    }
  });

  // Get unique completed quizzes by using findMany and counting the results
  const completedQuizResults = await db.quizResult.findMany({
    where: {
      studentId: session.user.id
    },
    select: {
      quizId: true
    }
  });

  // Count unique quizIds
  const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
  const completedQuizzes = uniqueQuizIds.size;

  // Calculate average score from quiz results (using best attempt for each quiz)
  const quizResults = await db.quizResult.findMany({
    where: {
      studentId: session.user.id
    },
    select: {
      quizId: true,
      percentage: true
    },
    orderBy: {
      percentage: 'desc' // Order by percentage descending to get best attempts first
    }
  });

  // Get only the best attempt for each quiz
  const bestAttempts = new Map();
  quizResults.forEach(result => {
    if (!bestAttempts.has(result.quizId)) {
      bestAttempts.set(result.quizId, result.percentage);
    }
  });

  const averageScore = bestAttempts.size > 0 
    ? Math.round(Array.from(bestAttempts.values()).reduce((sum, percentage) => sum + percentage, 0) / bestAttempts.size)
    : 0;

  const studentStats: StudentStats = {
    totalCourses,
    totalChapters,
    completedChapters,
    totalQuizzes,
    completedQuizzes,
    averageScore
  };

  const courses = await db.course.findMany({
    where: {
      purchases: {
        some: {
          userId: session.user.id,
          status: "ACTIVE"
        }
      }
    },
    include: {
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
      purchases: {
        where: {
          userId: session.user.id,
        }
      }
    },
    orderBy: {
      createdAt: "desc",
    }
  });

  // Batch fetch all progress data to avoid N+1 queries
  const allChapterIds = courses.flatMap(course => course.chapters.map(ch => ch.id));
  const allQuizIds = courses.flatMap(course => course.quizzes.map(q => q.id));

  const [allUserProgress, allQuizResults] = await Promise.all([
    allChapterIds.length > 0 ? db.userProgress.findMany({
      where: {
        userId: session.user.id,
        chapterId: { in: allChapterIds },
        isCompleted: true
      },
      select: {
        chapterId: true
      }
    }) : Promise.resolve([]),
    allQuizIds.length > 0 ? db.quizResult.findMany({
      where: {
        studentId: session.user.id,
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
  const coursesWithProgress = courses.map((course) => {
    const totalChapters = course.chapters.length;
    const totalQuizzes = course.quizzes.length;
    const totalContent = totalChapters + totalQuizzes;

    // Count completed chapters for this course
    const completedChapters = course.chapters.filter(ch => completedChaptersSet.has(ch.id)).length;
    
    // Count unique completed quizzes for this course
    const completedQuizzes = course.quizzes.filter(q => completedQuizzesSet.has(q.id)).length;

    const completedContent = completedChapters + completedQuizzes;

    const progress = totalContent > 0 
      ? (completedContent / totalContent) * 100 
      : 0;

    return {
      ...course,
      progress
    } as CourseWithProgress;
  });

  // Transform lastWatchedChapter data
  const transformedLastWatchedChapter = lastWatchedChapter ? {
    id: lastWatchedChapter.chapter.id,
    title: lastWatchedChapter.chapter.title,
    courseId: lastWatchedChapter.chapter.courseId,
    courseTitle: lastWatchedChapter.chapter.course.title,
    courseImageUrl: lastWatchedChapter.chapter.course.imageUrl,
    position: lastWatchedChapter.chapter.position,
  } : null;

  return (
    <DashboardContent
      user={user}
      lastWatchedChapter={transformedLastWatchedChapter}
      studentStats={studentStats}
      coursesWithProgress={coursesWithProgress}
    />
  );
}

export default CoursesPage; 