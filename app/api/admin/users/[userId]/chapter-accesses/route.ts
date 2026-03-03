import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check if user is admin
        if (session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");

        // Get chapter accesses for the student
        const accesses = await db.chapterAccess.findMany({
            where: {
                userId: userId,
                ...(courseId ? {
                    chapter: {
                        courseId: courseId
                    }
                } : {})
            },
            select: {
                chapterId: true
            }
        });

        // If filtering by course, also check if the student has a non-expired course-level purchase
        let hasCourseAccess = false;
        if (courseId) {
            const purchase = await db.purchase.findFirst({
                where: {
                    userId: userId,
                    courseId: courseId,
                    status: "ACTIVE"
                },
                include: {
                    course: {
                        select: { accessDurationDays: true }
                    }
                }
            });
            if (purchase) {
                const days = purchase.course.accessDurationDays ?? 7;
                if (days === 0) {
                    hasCourseAccess = true;
                } else {
                    const expiresAt = new Date(
                        purchase.createdAt.getTime() + days * 24 * 60 * 60 * 1000
                    );
                    hasCourseAccess = expiresAt > new Date();
                }
            }
        }

        return NextResponse.json({ accesses, hasCourseAccess });
    } catch (error) {
        console.error("[ADMIN_GET_CHAPTER_ACCESSES]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

