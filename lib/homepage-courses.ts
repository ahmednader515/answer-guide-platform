import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function normalizeGrade(grade: string): string {
  const trimmed = grade.trim();
  const upperGrade = trimmed.toUpperCase();
  if (upperGrade === "FIRST_SECONDARY") return "الأول الثانوي";
  if (upperGrade === "SECOND_SECONDARY") return "الثاني الثانوي";
  if (upperGrade === "THIRD_SECONDARY") return "الثالث الثانوي";
  return trimmed;
}

export async function getHomepageCourses() {
  const session = await getServerSession(authOptions);
  let gradeFilter: string | null = null;

  if (session?.user?.role === "USER" && session.user.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { grade: true },
    });
    const userGrade = user?.grade?.trim();
    if (userGrade) {
      gradeFilter = normalizeGrade(userGrade);
    }
  }

  const courses = await db.course.findMany({
    where: gradeFilter
      ? { isPublished: true, grade: gradeFilter }
      : { isPublished: true },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          image: true,
        },
      },
      chapters: {
        where: { isPublished: true },
        select: { id: true },
      },
      quizzes: {
        where: { isPublished: true },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return courses
    .filter((course) => course.user != null)
    .map((course) => ({
      ...course,
        progress: 0,
        purchases: [],
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    }));
}
