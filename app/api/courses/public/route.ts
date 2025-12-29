import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Only use cacheStrategy if using Prisma Accelerate (URL starts with prisma://)
    const isAccelerate = process.env.DATABASE_URL?.startsWith("prisma://");
    const queryOptions: any = {
      where: {
        isPublished: true,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            image: true,
          }
        },
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
      },
      orderBy: {
        createdAt: "desc",
      },
    };

    // Only add cacheStrategy if using Accelerate
    if (isAccelerate && process.env.NODE_ENV === "production") {
      queryOptions.cacheStrategy = { ttl: 120 };
    }

    const courses = await db.course.findMany(queryOptions);

    // Return courses with default progress of 0 for public view
    // Filter out courses where user might be null (deleted users)
    const coursesWithDefaultProgress = courses
      .filter((course) => {
        // Type guard to ensure user exists
        return (course as any).user !== null && (course as any).user !== undefined;
      })
      .map((course: any) => ({
        ...course,
        progress: 0,
        // Ensure dates are serializable
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      }));

    return NextResponse.json(coursesWithDefaultProgress);
  } catch (error) {
    console.error("[COURSES_PUBLIC] Error:", error);
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error("[COURSES_PUBLIC] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    // Return empty array on any error to prevent page breakage
    // This is a public endpoint, so it's better to show no courses than an error
    return NextResponse.json([]);
  }
} 