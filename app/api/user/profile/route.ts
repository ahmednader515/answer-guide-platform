import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_GRADES = ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي"] as const;

function normalizeGrade(grade: string | null | undefined): string | null {
    if (!grade) return null;
    const trimmed = grade.trim();
    if ((ALLOWED_GRADES as readonly string[]).includes(trimmed)) return trimmed;
    const normalized = trimmed.toUpperCase();
    if (normalized === "FIRST_SECONDARY") return "الأول الثانوي";
    if (normalized === "SECOND_SECONDARY") return "الثاني الثانوي";
    if (normalized === "THIRD_SECONDARY") return "الثالث الثانوي";
    return null;
}

export async function GET(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });
        const userId = (token?.id as string | undefined) ?? token?.sub;
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                grade: true,
            },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        return NextResponse.json({
            ...user,
            grade: normalizeGrade(user.grade) ?? user.grade,
        });
    } catch (error) {
        console.error("[USER_PROFILE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });
        const userId = (token?.id as string | undefined) ?? token?.sub;
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
        const grade = normalizeGrade(typeof body.grade === "string" ? body.grade : "");

        if (!fullName) {
            return new NextResponse("Name is required", { status: 400 });
        }
        if (!grade) {
            return new NextResponse("Invalid grade", { status: 400 });
        }

        const user = await db.user.update({
            where: { id: userId },
            data: {
                fullName,
                grade,
            },
            select: {
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                grade: true,
            },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("[USER_PROFILE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
