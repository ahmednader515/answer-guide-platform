import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
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

        const { chapterId } = await req.json();

        if (!chapterId) {
            return NextResponse.json(
                { error: "Chapter ID is required" },
                { status: 400 }
            );
        }

        // Check if user exists and is a student
        const user = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user || user.role !== "USER") {
            return NextResponse.json(
                { error: "Student not found" },
                { status: 404 }
            );
        }

        // Check if chapter exists and is published
        const chapter = await db.chapter.findUnique({
            where: {
                id: chapterId
            },
            include: {
                course: {
                    select: {
                        isPublished: true
                    }
                }
            }
        });

        if (!chapter || !chapter.course.isPublished || !chapter.isPublished) {
            return NextResponse.json(
                { error: "Chapter not found or not published" },
                { status: 404 }
            );
        }

        // Check if student already has access to this chapter
        const existingAccess = await db.chapterAccess.findUnique({
            where: {
                userId_chapterId: {
                    userId: userId,
                    chapterId: chapterId,
                }
            }
        });

        if (existingAccess) {
            return NextResponse.json(
                { error: "Student already has access to this chapter" },
                { status: 400 }
            );
        }

        // Create chapter access record
        const chapterAccess = await db.chapterAccess.create({
            data: {
                userId: userId,
                chapterId: chapterId,
            }
        });

        return NextResponse.json({
            message: "Chapter access added successfully",
            chapterAccess
        });

    } catch (error) {
        console.error("[ADMIN_ADD_CHAPTER]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
} 

export async function DELETE(
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

        if (session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { chapterId, courseId } = body;

        if (!chapterId) {
            return NextResponse.json(
                { error: "Chapter ID is required" },
                { status: 400 }
            );
        }

        // Ensure student exists
        const user = await db.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user || user.role !== "USER") {
            return NextResponse.json(
                { error: "Student not found" },
                { status: 404 }
            );
        }

        // Fetch chapter to resolve courseId if not provided
        const chapter = await db.chapter.findUnique({
            where: { id: chapterId },
            select: { courseId: true },
        });

        if (!chapter) {
            return NextResponse.json(
                { error: "Chapter not found" },
                { status: 404 }
            );
        }

        const resolvedCourseId = courseId || chapter.courseId;

        // Find existing chapter access record
        const existingAccess = await db.chapterAccess.findUnique({
            where: {
                userId_chapterId: {
                    userId: userId,
                    chapterId: chapterId,
                },
            },
        });

        if (existingAccess) {
            // Simple case: chapter-level access record exists, just delete it
            await db.chapterAccess.delete({
                where: { id: existingAccess.id },
            });
        } else {
            // No chapter-level record — check if student has full course-level access via Purchase
            const purchase = await db.purchase.findFirst({
                where: {
                    userId: userId,
                    courseId: resolvedCourseId,
                    status: "ACTIVE",
                }
            });

            if (!purchase) {
                return NextResponse.json(
                    { error: "Chapter access not found for this student" },
                    { status: 404 }
                );
            }

            // Student has full course access — convert to chapter-level access by granting
            // access to all OTHER published chapters, leaving this one without access.
            const otherChapters = await db.chapter.findMany({
                where: {
                    courseId: resolvedCourseId,
                    isPublished: true,
                    id: { not: chapterId },
                },
                select: { id: true },
            });

            await db.chapterAccess.createMany({
                data: otherChapters.map((ch) => ({
                    userId: userId,
                    chapterId: ch.id,
                })),
                skipDuplicates: true,
            });
        }

        return NextResponse.json({ message: "Chapter access removed successfully" });
    } catch (error) {
        console.error("[ADMIN_REMOVE_CHAPTER]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

