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

        if (!token) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (token.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const skip = parseInt(searchParams.get("skip") || "0");
        const take = parseInt(searchParams.get("take") || "25");
        const search = searchParams.get("search") || "";
        const roleFilter = searchParams.get("role"); // Optional role filter (e.g., "ADMIN,TEACHER" or "USER")
        const gradeFilter = searchParams.get("grade");

        const whereClause: Record<string, unknown> = {};

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

        return NextResponse.json({
            users,
            total,
            hasMore: skip + take < total,
        });
    } catch (error) {
        console.error("[ADMIN_USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
