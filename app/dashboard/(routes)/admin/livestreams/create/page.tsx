"use client";

import { useState, useEffect } from "react";
import { useNavigationRouter } from "@/lib/hooks/use-navigation-router";
import { useLanguage } from "@/lib/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Radio } from "lucide-react";

interface Course {
  id: string;
  title: string;
}

export default function AdminCreateLivestreamStandalonePage() {
  const { t } = useLanguage();
  const router = useNavigationRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => toast.error(t("common.error")))
      .finally(() => setLoadingCourses(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      toast.error(t("livestream.selectCourseError"));
      return;
    }
    if (!title || !meetingLink || !scheduledAt || !expiresAt) {
      toast.error(t("livestream.fillRequiredFields"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/livestreams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, meetingLink, scheduledAt, expiresAt }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(t("livestream.created"));
      router.push(`/dashboard/admin/courses/${courseId}/livestreams/${data.id}/edit`);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="h-7 w-7" />
        <h1 className="text-2xl font-bold">{t("livestream.createTitle")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("livestream.createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Course selector */}
            <div className="space-y-2">
              <Label>{t("teacher.quizzes.table.course")}</Label>
              <Select value={courseId} onValueChange={setCourseId} disabled={loadingCourses}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingCourses ? t("common.loading") : t("livestream.selectCourse")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>{t("livestream.titleField")}</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("livestream.titlePlaceholder")}
                disabled={submitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t("livestream.description")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("livestream.descriptionPlaceholder")}
                rows={3}
                disabled={submitting}
              />
            </div>

            {/* Meeting link */}
            <div className="space-y-2">
              <Label>{t("livestream.meetingLink")}</Label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                type="url"
                disabled={submitting}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("livestream.scheduledAt")}</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("livestream.expiresAt")}</Label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/admin/livestreams")}
                disabled={submitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting} className="bg-brand hover:bg-brand/90 text-white">
                {submitting ? t("common.loading") : t("livestream.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
