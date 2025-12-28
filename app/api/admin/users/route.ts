import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const skip = parseInt(searchParams.get("skip") || "0");
        const take = parseInt(searchParams.get("take") || "25");

        const [users, total] = await Promise.all([
            db.user.findMany({
                select: {
                    id: true,
                    fullName: true,
                    phoneNumber: true,
                    parentPhoneNumber: true,
                    role: true,
                    balance: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            courses: true,
                            purchases: true,
                            userProgress: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                skip,
                take
            }),
            db.user.count()
        ]);

        return NextResponse.json({
            users,
            total,
            hasMore: skip + take < total
        });
    } catch (error) {
        console.error("[ADMIN_USERS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 