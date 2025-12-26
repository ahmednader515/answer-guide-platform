import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE - Delete or hide codes
export async function DELETE(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { courseId, action, codeIds } = await req.json();

    if (!courseId && !codeIds) {
      return new NextResponse("Course ID or code IDs are required", { status: 400 });
    }

    if (!action || !["delete", "hide"].includes(action)) {
      return new NextResponse("Action must be 'delete' or 'hide'", { status: 400 });
    }

    const whereClause: any = {};

    if (codeIds && Array.isArray(codeIds) && codeIds.length > 0) {
      whereClause.id = { in: codeIds };
    } else if (courseId) {
      whereClause.courseId = courseId;
    }

    if (action === "delete") {
      // Permanently delete codes
      const result = await db.purchaseCode.deleteMany({
        where: whereClause,
      });

      return NextResponse.json({
        success: true,
        deleted: result.count,
      });
    } else {
      // Hide codes
      const result = await db.purchaseCode.updateMany({
        where: whereClause,
        data: {
          isHidden: true,
        },
      });

      return NextResponse.json({
        success: true,
        hidden: result.count,
      });
    }
  } catch (error) {
    console.error("[ADMIN_CODES_BULK_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH - Restore hidden codes
export async function PATCH(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { codeIds } = await req.json();

    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return new NextResponse("Code IDs array is required", { status: 400 });
    }

    // Restore hidden codes (admin can restore any codes)
    const result = await db.purchaseCode.updateMany({
      where: {
        id: { in: codeIds },
        isHidden: true,
      },
      data: {
        isHidden: false,
      },
    });

    return NextResponse.json({
      success: true,
      restored: result.count,
    });
  } catch (error) {
    console.error("[ADMIN_CODES_BULK_RESTORE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

