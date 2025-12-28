import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

// Generate unique code
function generateCode(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}

// GET - List all codes
export async function GET(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeHidden = searchParams.get("includeHidden") === "true";
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "25");

    const whereClause: any = {};
    
    // When includeHidden is false, only show non-hidden codes
    // When includeHidden is true, show all codes (hidden and non-hidden)
    if (includeHidden !== true) {
      whereClause.isHidden = false;
    }

    const [codes, total] = await Promise.all([
      db.purchaseCode.findMany({
        where: whereClause,
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
      db.purchaseCode.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      codes,
      total,
      hasMore: skip + take < total,
    });
  } catch (error) {
    console.error("[ADMIN_CODES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Generate new codes
export async function POST(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { courseId, count, grade } = await req.json();

    if (!courseId || !count || count < 1 || count > 100 || !grade) {
      return new NextResponse("Invalid request: courseId, count (1-100), and grade required", { status: 400 });
    }

    // Verify course exists
    const course = await db.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    // Generate codes
    const codes = [];
    for (let i = 0; i < count; i++) {
      let code: string = "";
      let isUnique = false;
      
      // Ensure code is unique
      while (!isUnique) {
        code = generateCode();
        const existing = await db.purchaseCode.findUnique({
          where: { code },
        });
        if (!existing) {
          isUnique = true;
        }
      }

      codes.push({
        code,
        courseId,
        createdBy: userId,
        isUsed: false,
        grade,
      });
    }

    // Create codes in database
    const createdCodes = await db.purchaseCode.createMany({
      data: codes,
    });

    // Fetch created codes with course info
    const createdCodesWithDetails = await db.purchaseCode.findMany({
      where: {
        createdBy: userId,
        courseId,
        code: {
          in: codes.map((c) => c.code),
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: count,
    });

    return NextResponse.json({
      success: true,
      codes: createdCodesWithDetails,
      count: createdCodes.count,
    });
  } catch (error) {
    console.error("[ADMIN_CODES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

