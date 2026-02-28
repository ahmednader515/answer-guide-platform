"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useLanguage } from "@/lib/contexts/language-context";

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  meetingLink: z.string().url(),
  scheduledAt: z.string().min(1),
  expiresAt: z.string().min(1),
  isPublished: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface LivestreamFormProps {
  courseId: string;
  livestreamId?: string;
  defaultValues?: Partial<FormValues>;
  redirectBasePath: string;
}

export const LivestreamForm = ({
  courseId,
  livestreamId,
  defaultValues,
  redirectBasePath,
}: LivestreamFormProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!livestreamId;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      meetingLink: "",
      scheduledAt: "",
      expiresAt: "",
      isPublished: false,
      ...defaultValues,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      if (isEdit) {
        await axios.patch(
          `/api/courses/${courseId}/livestreams/${livestreamId}`,
          values
        );
        toast.success(t("livestream.saved"));
      } else {
        const res = await axios.post(
          `/api/courses/${courseId}/livestreams`,
          values
        );
        toast.success(t("livestream.created"));
        router.push(`${redirectBasePath}/courses/${courseId}/livestreams/${res.data.id}/edit`);
        return;
      }
      router.refresh();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!livestreamId) return;
    try {
      setIsSubmitting(true);
      await axios.delete(`/api/courses/${courseId}/livestreams/${livestreamId}`);
      toast.success(t("livestream.deleted"));
      router.push(`${redirectBasePath}/courses/${courseId}`);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onTogglePublish = async () => {
    if (!livestreamId) return;
    try {
      setIsSubmitting(true);
      const res = await axios.patch(
        `/api/courses/${courseId}/livestreams/${livestreamId}/publish`
      );
      form.setValue("isPublished", res.data.isPublished);
      toast.success(
        res.data.isPublished ? t("livestream.published") : t("livestream.unpublished")
      );
      router.refresh();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPublished = form.watch("isPublished");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? t("livestream.editTitle") : t("livestream.createTitle")}
          </h1>
        </div>
        {isEdit && (
          <div className="flex items-center gap-3">
            <Button
              variant={isPublished ? "outline" : "default"}
              onClick={onTogglePublish}
              disabled={isSubmitting}
            >
              {isPublished ? t("livestream.unpublish") : t("livestream.publish")}
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isSubmitting}
            >
              {t("common.delete")}
            </Button>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("livestream.titleField")}</FormLabel>
                <FormControl>
                  <Input
                    disabled={isSubmitting}
                    placeholder={t("livestream.titlePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("livestream.description")}</FormLabel>
                <FormControl>
                  <Textarea
                    disabled={isSubmitting}
                    placeholder={t("livestream.descriptionPlaceholder")}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meetingLink"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("livestream.meetingLink")}</FormLabel>
                <FormControl>
                  <Input
                    disabled={isSubmitting}
                    placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                    type="url"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("livestream.scheduledAt")}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("livestream.expiresAt")}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-x-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`${redirectBasePath}/courses/${courseId}`)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? t("common.save") : t("livestream.create")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
