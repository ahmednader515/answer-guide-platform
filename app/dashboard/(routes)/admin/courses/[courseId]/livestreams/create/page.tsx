import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LivestreamForm } from "@/components/livestream-form";

export default async function AdminCreateLivestreamPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { userId, user } = await auth();
  if (!userId) return redirect("/");
  if (user?.role !== "ADMIN") return redirect("/dashboard");

  const { courseId } = await params;

  return (
    <LivestreamForm
      courseId={courseId}
      redirectBasePath="/dashboard/admin"
    />
  );
}
