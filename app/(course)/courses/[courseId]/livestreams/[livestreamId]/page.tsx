"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ExternalLink, Calendar, Clock, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/contexts/language-context";

interface Livestream {
  id: string;
  title: string;
  description: string | null;
  meetingLink: string;
  scheduledAt: string;
  expiresAt: string;
  isPublished: boolean;
}

export default function StudentLivestreamPage() {
  const params = useParams() as { courseId: string; livestreamId: string };
  const router = useRouter();
  const { t } = useLanguage();
  const [livestream, setLivestream] = useState<Livestream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLivestream = async () => {
      try {
        const res = await axios.get(
          `/api/courses/${params.courseId}/livestreams/${params.livestreamId}`
        );
        setLivestream(res.data);
      } catch {
        router.push(`/courses/${params.courseId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchLivestream();
  }, [params.courseId, params.livestreamId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent" />
      </div>
    );
  }

  if (!livestream) return null;

  const now = new Date();
  const expiresAt = new Date(livestream.expiresAt);
  const scheduledAt = new Date(livestream.scheduledAt);
  const isExpired = now > expiresAt;

  const formatDate = (date: Date) =>
    date.toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Radio className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{livestream.title}</h1>
            <Badge variant="outline">{t("livestream.label")}</Badge>
            {isExpired && (
              <Badge variant="destructive">{t("livestream.ended")}</Badge>
            )}
          </div>
          {livestream.description && (
            <p className="text-muted-foreground mt-2">{livestream.description}</p>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-5 space-y-4 bg-card">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <span className="font-medium">{t("livestream.scheduledAt")}: </span>
            <span className="text-muted-foreground">{formatDate(scheduledAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <span className="font-medium">{t("livestream.expiresAt")}: </span>
            <span className="text-muted-foreground">{formatDate(expiresAt)}</span>
          </div>
        </div>
      </div>

      {isExpired ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center space-y-2">
          <p className="text-lg font-semibold text-destructive">{t("livestream.ended")}</p>
          <p className="text-sm text-muted-foreground">
            {t("livestream.endedDescription")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border p-6 text-center space-y-4 bg-card">
          <p className="text-muted-foreground text-sm">{t("livestream.joinPrompt")}</p>
          <Button asChild size="lg" className="gap-2">
            <a href={livestream.meetingLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              {t("livestream.joinNow")}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
