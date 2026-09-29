import { NextResponse } from "next/server";
import { getHomepageCourses } from "@/lib/homepage-courses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const courses = await getHomepageCourses();
    return NextResponse.json(courses, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[COURSES_PUBLIC] Error:", error);
    return NextResponse.json([]);
  }
}
