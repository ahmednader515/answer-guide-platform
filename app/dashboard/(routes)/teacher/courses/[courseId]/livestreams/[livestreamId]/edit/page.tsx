import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LivestreamForm } from "@/components/livestream-form";

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function TeacherEditLivestreamPage({
  params,
}: {
  params: Promise<{ courseId: string; livestreamId: string }>;
}) {
  const { userId, user } = await auth();
  if (!userId) return redirect("/");

  const { courseId, livestreamId } = await params;

  const livestream = await db.livestream.findUnique({
    where: { id: livestreamId, courseId },
  });

  if (!livestream) return redirect(`/dashboard/teacher/courses/${courseId}`);

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return redirect("/dashboard/teacher");

  if (user?.role !== "ADMIN" && course.userId !== userId) {
    return redirect("/dashboard");
  }

  return (
    <LivestreamForm
      courseId={courseId}
      livestreamId={livestreamId}
      redirectBasePath="/dashboard/teacher"
      defaultValues={{
        title: livestream.title,
        description: livestream.description ?? "",
        meetingLink: livestream.meetingLink,
        scheduledAt: toLocalDatetimeString(livestream.scheduledAt),
        expiresAt: toLocalDatetimeString(livestream.expiresAt),
        isPublished: livestream.isPublished,
      }}
    />
  );
}
