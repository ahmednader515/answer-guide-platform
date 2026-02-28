import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LivestreamForm } from "@/components/livestream-form";

export default async function TeacherCreateLivestreamPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return redirect("/");

  const { courseId } = await params;

  return (
    <LivestreamForm
      courseId={courseId}
      redirectBasePath="/dashboard/teacher"
    />
  );
}
