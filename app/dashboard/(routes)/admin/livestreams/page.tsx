"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Edit, Trash2, Radio, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigationRouter } from "@/lib/hooks/use-navigation-router";
import { useLanguage } from "@/lib/contexts/language-context";

interface Livestream {
  id: string;
  title: string;
  description: string | null;
  meetingLink: string;
  scheduledAt: string;
  expiresAt: string;
  isPublished: boolean;
  courseId: string;
  course: { id: string; title: string };
  createdAt: string;
}

export default function AdminLivestreamsPage() {
  const { t } = useLanguage();
  const router = useNavigationRouter();
  const [livestreams, setLivestreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLivestreams = async () => {
    try {
      const res = await fetch("/api/admin/livestreams");
      if (res.ok) setLivestreams(await res.json());
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLivestreams();
  }, []);

  const handleDelete = async (ls: Livestream) => {
    if (!confirm(t("livestream.deleteConfirm"))) return;
    setDeletingId(ls.id);
    try {
      const res = await fetch(`/api/courses/${ls.courseId}/livestreams/${ls.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t("livestream.deleted"));
        fetchLivestreams();
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (ls: Livestream) => {
    try {
      const res = await fetch(
        `/api/courses/${ls.courseId}/livestreams/${ls.id}/publish`,
        { method: "PATCH" }
      );
      if (res.ok) {
        toast.success(ls.isPublished ? t("livestream.unpublished") : t("livestream.published"));
        fetchLivestreams();
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const filtered = livestreams.filter(
    (ls) =>
      ls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ls.course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Radio className="h-7 w-7" />
          {t("sidebar.admin.livestreams")}
        </h1>
        <Button
          onClick={() => router.push("/dashboard/admin/livestreams/create")}
          className="bg-brand hover:bg-brand/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("livestream.addLivestream")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sidebar.admin.livestreams")}</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("livestream.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t("livestream.noLivestreams")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right ltr:text-left">{t("livestream.titleField")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.course")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">{t("livestream.scheduledAt")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">{t("livestream.expiresAt")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.status")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.quizzes.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ls) => {
                    const expired = new Date() > new Date(ls.expiresAt);
                    return (
                      <TableRow key={ls.id}>
                        <TableCell className="font-medium">{ls.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ls.course.title}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(ls.scheduledAt)}</TableCell>
                        <TableCell>{formatDate(ls.expiresAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={ls.isPublished ? "default" : "secondary"}>
                              {ls.isPublished
                                ? t("teacher.quizzes.status.published")
                                : t("teacher.quizzes.status.draft")}
                            </Badge>
                            {expired && (
                              <Badge variant="destructive">{t("livestream.ended")}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              className="bg-brand hover:bg-brand/90 text-white"
                              onClick={() =>
                                router.push(
                                  `/dashboard/admin/courses/${ls.courseId}/livestreams/${ls.id}/edit`
                                )
                              }
                            >
                              <Edit className="h-4 w-4" />
                              {t("teacher.quizzes.actions.edit")}
                            </Button>
                            <Button
                              size="sm"
                              variant={ls.isPublished ? "destructive" : "default"}
                              className={!ls.isPublished ? "bg-brand hover:bg-brand/90 text-white" : ""}
                              onClick={() => handleTogglePublish(ls)}
                            >
                              {ls.isPublished
                                ? t("livestream.unpublish")
                                : t("livestream.publish")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(ls)}
                              disabled={deletingId === ls.id}
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingId === ls.id
                                ? t("teacher.quizzes.actions.deleting")
                                : t("teacher.quizzes.actions.delete")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
