import { getSiteSettings } from "@/lib/site-settings";
import { HomePageClient } from "@/components/home-page-client";

export default async function HomePage() {
  const siteSettings = await getSiteSettings();
  return <HomePageClient siteSettings={siteSettings} />;
}
