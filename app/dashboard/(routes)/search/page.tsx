import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { SearchContent } from "./_components/search-content";
import { Course, Purchase } from "@prisma/client";

type CourseWithDetails = Course & {
    chapters: { id: string }[];
    purchases: Purchase[];
    progress: number;
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return redirect("/");
    }

    // Get user's grade
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { grade: true },
    });

    const resolvedParams = await searchParams;
    const title = typeof resolvedParams.title === 'string' ? resolvedParams.title : '';

    // Build where clause - show courses that match user's grade OR courses with no grade specified
    let whereClause: any = {
        isPublished: true,
    };

    // Add title filter if provided
    if (title) {
        whereClause.title = {
            contains: title,
        };
    }

    // Filter by grade: show courses matching student's grade OR courses with no grade (null)
    if (user?.grade && user.grade.trim()) {
        // Trim and normalize the grade value to ensure exact match
        const userGrade = user.grade.trim();
        
        // Normalize old English values to Arabic for backward compatibility
        let normalizedUserGrade = userGrade;
        const upperGrade = userGrade.toUpperCase();
        if (upperGrade === "FIRST_SECONDARY") normalizedUserGrade = "الأول الثانوي";
        else if (upperGrade === "SECOND_SECONDARY") normalizedUserGrade = "الثاني الثانوي";
        else if (upperGrade === "THIRD_SECONDARY") normalizedUserGrade = "الثالث الثانوي";
        
        // Use AND to combine base conditions with grade filter
        // Structure: (isPublished AND title) AND (grade = userGrade OR grade = normalizedUserGrade OR grade = null)
        // This handles both Arabic and old English values
        whereClause = {
            AND: [
                {
                    isPublished: true,
                    ...(title && {
                        title: {
                            contains: title,
                        },
                    }),
                },
                {
                    OR: [
                        { grade: userGrade }, // Match exact Arabic value
                        ...(normalizedUserGrade !== userGrade ? [{ grade: normalizedUserGrade }] : []), // Match normalized value if different
                        { grade: null }, // Courses with no grade (available to all)
                    ],
                },
            ],
        };
    }
    // If user has no grade, don't filter by grade - show all courses (whereClause already set above)

    // Only use cacheStrategy if using Prisma Accelerate (URL starts with prisma://)
    const isAccelerate = process.env.DATABASE_URL?.startsWith("prisma://");
    const queryOptions: any = {
        where: whereClause,
        include: {
            chapters: {
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
        },
    };

    // Only add cacheStrategy if using Accelerate
    if (isAccelerate && process.env.NODE_ENV === "production") {
        queryOptions.cacheStrategy = { ttl: 60 };
    }

    const courses = await db.course.findMany(queryOptions);

    // Batch fetch all progress data to avoid N+1 queries
    const allChapterIds = courses.flatMap(course => course.chapters.map(ch => ch.id));
    
    const allUserProgress = allChapterIds.length > 0 ? await db.userProgress.findMany({
        where: {
            userId: session.user.id,
            chapterId: { in: allChapterIds },
            isCompleted: true
        },
        select: {
            chapterId: true
        }
    }) : [];

    // Create a set for O(1) lookup
    const completedChaptersSet = new Set(allUserProgress.map(up => up.chapterId));

    // Calculate progress for each course using the batched data
    const coursesWithProgress = courses.map((course) => {
        const totalChapters = course.chapters.length;
        // Count completed chapters for this course
        const completedChapters = course.chapters.filter(ch => completedChaptersSet.has(ch.id)).length;

        const progress = totalChapters > 0 
            ? (completedChapters / totalChapters) * 100 
            : 0;

        return {
            ...course,
            progress
        } as CourseWithDetails;
    });

    return (
        <SearchContent 
            title={title}
            coursesWithProgress={coursesWithProgress}
        />
    );
}