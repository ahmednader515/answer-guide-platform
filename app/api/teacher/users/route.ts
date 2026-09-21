import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        console.log("[TEACHER_USERS_GET] Token:", { userId: token?.id ?? token?.sub, role: token?.role });

        if (!token) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (token.role !== "TEACHER") {
            console.log("[TEACHER_USERS_GET] Access denied:", { userId: token.id ?? token.sub, role: token.role });
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const skip = parseInt(searchParams.get("skip") || "0");
        const take = parseInt(searchParams.get("take") || "25");
        const search = searchParams.get("search") || "";
        const roleFilter = searchParams.get("role"); // Optional role filter (e.g., "ADMIN,TEACHER" or "USER")
        const gradeFilter = searchParams.get("grade");

        // Build where clause - Teachers can see all users (USER, TEACHER, and ADMIN roles)
        const whereClause: Record<string, unknown> = {};

        // Determine which roles to include
        let allowedRoles = ["USER", "TEACHER", "ADMIN"];
        if (roleFilter) {
            allowedRoles = roleFilter.split(",").map((r) => r.trim());
        }

        if (search.trim()) {
            whereClause.AND = [
                {
                    role: {
                        in: allowedRoles,
                    },
                },
                {
                    OR: [
                        {
                            fullName: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            phoneNumber: {
                                contains: search,
                            },
                        },
                    ],
                },
            ];
        } else {
            whereClause.role = {
                in: allowedRoles,
            };
        }

        if (gradeFilter) {
            whereClause.grade = gradeFilter;
        }

        const [users, total] = await Promise.all([
            db.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    fullName: true,
                    phoneNumber: true,
                    parentPhoneNumber: true,
                    role: true,
                    grade: true,
                    balance: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            courses: true,
                            purchases: true,
                            userProgress: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take,
            }),
            db.user.count({ where: whereClause }),
        ]);

        console.log("[TEACHER_USERS_GET] Found users:", users.length);
        console.log("[TEACHER_USERS_GET] Users by role:", {
            USER: users.filter((u) => u.role === "USER").length,
            TEACHER: users.filter((u) => u.role === "TEACHER").length,
            ADMIN: users.filter((u) => u.role === "ADMIN").length,
        });

        return NextResponse.json({
            users,
            total,
            hasMore: skip + take < total,
        });
    } catch (error) {
        console.error("[TEACHER_USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
