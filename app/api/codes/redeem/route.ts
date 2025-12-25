import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Redeem a code
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "unauthorized", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "codeRequired", message: "Code is required" },
        { status: 400 }
      );
    }

    // Find the code
    const purchaseCode = await db.purchaseCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        course: true,
      },
    });

    if (!purchaseCode) {
      return NextResponse.json(
        { error: "invalidCode", message: "Invalid code" },
        { status: 404 }
      );
    }

    if (purchaseCode.isUsed) {
      return NextResponse.json(
        { error: "codeAlreadyUsed", message: "Code has already been used" },
        { status: 400 }
      );
    }

    // Hidden codes can still be used, but we check anyway
    // (isHidden is just for display purposes in the admin/teacher panel)

    // Check if user already purchased this course
    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: purchaseCode.courseId,
        },
      },
    });

    if (existingPurchase && existingPurchase.status === "ACTIVE") {
      return NextResponse.json(
        { error: "alreadyPurchased", message: "You have already purchased this course" },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Mark code as used and automatically hide it
      await tx.purchaseCode.update({
        where: { id: purchaseCode.id },
        data: {
          isUsed: true,
          usedBy: userId,
          usedAt: new Date(),
          isHidden: true, // Automatically move to hidden table when used
        },
      });

      // Delete any existing failed purchase
      if (existingPurchase && existingPurchase.status === "FAILED") {
        await tx.purchase.delete({
          where: {
            id: existingPurchase.id,
          },
        });
      }

      // Create the purchase
      const purchase = await tx.purchase.create({
        data: {
          userId,
          courseId: purchaseCode.courseId,
          status: "ACTIVE",
          purchaseCodeId: purchaseCode.id,
        },
      });

      return { purchase };
    });

    return NextResponse.json({
      success: true,
      purchaseId: result.purchase.id,
      course: {
        id: purchaseCode.course.id,
        title: purchaseCode.course.title,
      },
    });
  } catch (error) {
    console.error("[REDEEM_CODE]", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "serverError", message: `Internal Error: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "serverError", message: "Internal Error" },
      { status: 500 }
    );
  }
}

