import { getSiteSettings } from "@/lib/site-settings";
import { HomePageClient } from "@/components/home-page-client";
import { getHomepageCourses } from "@/lib/homepage-courses";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [siteSettings, courses] = await Promise.all([
    getSiteSettings(),
    getHomepageCourses(),
  ]);

  return <HomePageClient siteSettings={siteSettings} initialCourses={courses} />;
}
