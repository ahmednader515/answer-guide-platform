"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface SiteSettingsContextType {
  logoUrl: string;
  teacherImageUrl: string;
  isLoaded: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  logoUrl: "",
  teacherImageUrl: "",
  isLoaded: false,
});

export const SiteSettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [logoUrl, setLogoUrl] = useState("");
  const [teacherImageUrl, setTeacherImageUrl] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
        if (data?.teacherImageUrl) setTeacherImageUrl(data.teacherImageUrl);
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ logoUrl, teacherImageUrl, isLoaded }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
