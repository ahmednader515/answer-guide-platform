import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        let userId: string | null = null;
        try {
            const authResult = await auth();
            userId = authResult.userId || null;
        } catch {
            // User not authenticated, which is fine
        }

        // Get course to check purchase
        const course = userId ? await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
            },
            include: {
                purchases: {
                    where: {
                        userId: userId,
                        status: "ACTIVE"
                    }
                },
            }
        }) : null;

        const hasCourseAccess = userId && course?.purchases && course.purchases.length > 0;

        // Get chapter accesses for the user
        const chapterAccesses = userId ? await db.chapterAccess.findMany({
            where: {
                userId: userId,
                chapter: {
                    courseId: resolvedParams.courseId
                }
            },
            select: {
                chapterId: true
            }
        }) : [];

        const chapterAccessSet = new Set(chapterAccesses.map(a => a.chapterId));

        // Get chapters
        const chapters = await db.chapter.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                userProgress: userId ? {
                    where: {
                        userId: userId
                    },
                    select: {
                        isCompleted: true
                    }
                } : false,
            },
            orderBy: {
                position: "asc"
            }
        });

        // Get published quizzes
        const quizzes = await db.quiz.findMany({
            where: {
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                quizResults: {
                    select: {
                        id: true,
                        score: true,
                        totalPoints: true,
                        percentage: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            }
        });

        // Combine and sort by position, adding access information
        // Logic: 
        // 1. Free chapters are always accessible
        // 2. If student has course access AND there are chapter access records for this course:
        //    - Only chapters with explicit chapter access are accessible (teacher is using chapter-level control)
        // 3. If student has course access AND there are NO chapter access records:
        //    - All chapters are accessible (backward compatibility - teacher hasn't set up chapter-level control)
        // 4. If student doesn't have course access:
        //    - Only chapters with explicit chapter access are accessible
        const allContent = [
            ...chapters.map(chapter => {
                // Free chapters are always accessible
                if (chapter.isFree) {
                    return {
                        ...chapter,
                        type: 'chapter' as const,
                        hasAccess: true
                    };
                }
                
                // If student has course access
                if (hasCourseAccess) {
                    // If there are any chapter access records for this course, use chapter-level control
                    // This means the teacher is managing access at the chapter level
                    if (chapterAccesses.length > 0) {
                        // Only chapters with explicit access are available
                        return {
                            ...chapter,
                            type: 'chapter' as const,
                            hasAccess: chapterAccessSet.has(chapter.id)
                        };
                    } else {
                        // No chapter access records exist, so all chapters are accessible (backward compatibility)
                        return {
                            ...chapter,
                            type: 'chapter' as const,
                            hasAccess: true
                        };
                    }
                }
                
                // Without course access, only chapters with explicit access are available
                return {
                    ...chapter,
                    type: 'chapter' as const,
                    hasAccess: chapterAccessSet.has(chapter.id)
                };
            }),
            ...quizzes.map(quiz => ({
                ...quiz,
                type: 'quiz' as const
            }))
        ].sort((a, b) => a.position - b.position);

        return NextResponse.json(allContent);
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 