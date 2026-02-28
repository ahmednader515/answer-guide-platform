"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { IconBadge } from "@/components/icon-badge";

interface CommentsEnabledFormProps {
  initialData: { commentsEnabled: boolean };
  courseId: string;
  chapterId: string;
}

export const CommentsEnabledForm = ({
  initialData,
  courseId,
  chapterId,
}: CommentsEnabledFormProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [enabled, setEnabled] = useState(initialData.commentsEnabled);

  const handleToggle = async (value: boolean) => {
    try {
      setIsLoading(true);
      setEnabled(value);

      const res = await fetch(`/api/courses/${courseId}/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentsEnabled: value }),
      });

      if (!res.ok) throw new Error();

      toast.success(t("teacher.chapterEdit.updateSuccess"));
      router.refresh();
    } catch {
      setEnabled(!value);
      toast.error(t("teacher.chapterEdit.updateError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-x-2">
        <IconBadge icon={MessageSquare} />
        <h2 className="text-xl">{t("comments.title")}</h2>
      </div>
      <div className="border bg-card rounded-md p-4">
        <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md">
          <Checkbox
            id="commentsEnabled"
            checked={enabled}
            onCheckedChange={(checked) => handleToggle(!!checked)}
            disabled={isLoading}
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor="commentsEnabled" className="text-base font-medium cursor-pointer">
              {enabled ? t("comments.commentsEnabled") : t("comments.commentsDisabled")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? t("comments.enabledDescription")
                : t("comments.disabledDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
