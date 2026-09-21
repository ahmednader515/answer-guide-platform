import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** Mark chapter as completed */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
      update: {
        isCompleted: true,
      },
      create: {
        userId,
        chapterId: resolvedParams.chapterId,
        isCompleted: true,
      },
    });

    return NextResponse.json(userProgress);
  } catch (error) {
    console.log("[CHAPTER_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/** Track that the student opened / is watching this chapter (last lesson) */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        userId,
        chapterId: resolvedParams.chapterId,
        isCompleted: false,
      },
    });

    return NextResponse.json(userProgress);
  } catch (error) {
    console.log("[CHAPTER_PROGRESS_VISIT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const { userId } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // First check if the record exists
    const existingProgress = await db.userProgress.findUnique({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    if (!existingProgress) {
      return new NextResponse("Not Found", { status: 404 });
    }

    await db.userProgress.delete({
      where: {
        userId_chapterId: {
          userId,
          chapterId: resolvedParams.chapterId,
        },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[CHAPTER_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
