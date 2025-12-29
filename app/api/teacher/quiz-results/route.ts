import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        const { searchParams } = new URL(req.url);
        const quizId = searchParams.get('quizId');

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Build the where clause
        const search = searchParams.get("search") || "";
        
        // Base condition - teacher's courses
        const baseCondition = {
            quiz: {
                course: {
                    userId: userId
                }
            }
        };

        // Build AND conditions array
        const andConditions: any[] = [baseCondition];

        // Add quizId filter if provided
        if (quizId) {
            andConditions.push({ quizId });
        }

        // Add search filter if provided
        if (search.trim()) {
            andConditions.push({
                OR: [
                    {
                        user: {
                            fullName: {
                                contains: search,
                                mode: "insensitive"
                            }
                        }
                    },
                    {
                        user: {
                            phoneNumber: {
                                contains: search
                            }
                        }
                    },
                    {
                        quiz: {
                            title: {
                                contains: search,
                                mode: "insensitive"
                            }
                        }
                    },
                    {
                        quiz: {
                            course: {
                                title: {
                                    contains: search,
                                    mode: "insensitive"
                                }
                            }
                        }
                    }
                ]
            });
        }

        // If we have multiple conditions, use AND; otherwise use base condition
        const whereClause = andConditions.length > 1 
            ? { AND: andConditions }
            : baseCondition;

        const skip = parseInt(searchParams.get("skip") || "0");
        const take = parseInt(searchParams.get("take") || "25");

        // Get quiz results for quizzes owned by the teacher
        const [quizResults, total] = await Promise.all([
            db.quizResult.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            fullName: true,
                            phoneNumber: true
                        }
                    },
                    quiz: {
                        select: {
                            title: true,
                            course: {
                                select: {
                                    id: true,
                                    title: true
                                }
                            }
                        }
                    },
                    answers: {
                        include: {
                            question: {
                                select: {
                                    text: true,
                                    type: true,
                                    points: true,
                                    position: true
                                }
                            }
                        },
                        orderBy: {
                            question: {
                                position: 'asc'
                            }
                        }
                    }
                },
                orderBy: {
                    submittedAt: "desc"
                },
                skip,
                take
            }),
            db.quizResult.count({
                where: whereClause
            })
        ]);

        return NextResponse.json({
            quizResults,
            total,
            hasMore: skip + take < total
        });
    } catch (error) {
        console.log("[TEACHER_QUIZ_RESULTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 