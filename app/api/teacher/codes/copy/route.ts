import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Copy all codes for a course
export async function POST(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "TEACHER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { courseId } = await req.json();

    if (!courseId) {
      return new NextResponse("Course ID is required", { status: 400 });
    }

    // Get all codes for this course created by this teacher
    const codes = await db.purchaseCode.findMany({
      where: {
        courseId,
        createdBy: userId,
        isHidden: false,
      },
      select: {
        code: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (codes.length === 0) {
      return new NextResponse("No codes found for this course", { status: 404 });
    }

    // Join all codes with newline
    const codesText = codes.map((c) => c.code).join("\n");

    return NextResponse.json({
      success: true,
      codes: codesText,
      count: codes.length,
    });
  } catch (error) {
    console.error("[TEACHER_CODES_COPY]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

