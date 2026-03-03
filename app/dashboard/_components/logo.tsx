"use client";

import Image from "next/image";
import { useSiteSettings } from "@/lib/contexts/site-settings-context";

export const Logo = () => {
  const { logoUrl } = useSiteSettings();

  return (
    <Image
      height={80}
      width={80}
      alt="logo"
      src={logoUrl || "/logo.png"}
      unoptimized
    />
  );
};
