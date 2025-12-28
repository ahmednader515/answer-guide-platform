"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Plus, Copy, Check, Trash2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
  id: string;
  title: string;
  isPublished: boolean;
}

interface PurchaseCode {
  id: string;
  code: string;
  courseId: string;
  isUsed: boolean;
  isHidden: boolean;
  usedAt: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
  };
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
  } | null;
}

const TeacherCodesPage = () => {
  const { t } = useLanguage();
  const [codes, setCodes] = useState<PurchaseCode[]>([]);
  const [hiddenCodes, setHiddenCodes] = useState<PurchaseCode[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoreCodes, setLoadingMoreCodes] = useState(false);
  const [loadingMoreHidden, setLoadingMoreHidden] = useState(false);
  const [hasMoreCodes, setHasMoreCodes] = useState(false);
  const [hasMoreHidden, setHasMoreHidden] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [codeCount, setCodeCount] = useState<string>("1");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [isHiddenTableOpen, setIsHiddenTableOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<"delete" | "hide">("hide");
  const [deleteCourseId, setDeleteCourseId] = useState<string>("");

  useEffect(() => {
    fetchCodes(true);
    fetchCourses();
  }, []);

  const fetchCodes = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      }
      const skipCodes = reset ? 0 : codes.length;
      const skipHidden = reset ? 0 : hiddenCodes.length;

      const [visibleResponse, hiddenResponse] = await Promise.all([
        fetch(`/api/teacher/codes?includeHidden=false&skip=${skipCodes}&take=25`),
        fetch(`/api/teacher/codes?includeHidden=true&skip=${skipHidden}&take=25`),
      ]);

      if (visibleResponse.ok) {
        const visibleData = await visibleResponse.json();
        // Filter out hidden codes and used codes (used codes are automatically hidden)
        const filteredCodes = (visibleData.codes || []).filter((code: PurchaseCode) => !code.isHidden && !code.isUsed);
        if (reset) {
          // Remove duplicates when resetting
          const uniqueCodes = Array.from(
            new Map(filteredCodes.map((code: PurchaseCode) => [code.id, code])).values()
          ) as PurchaseCode[];
          setCodes(uniqueCodes);
        } else {
          // Remove duplicates when appending
          setCodes(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newCodes = filteredCodes.filter((code: PurchaseCode) => !existingIds.has(code.id));
            return [...prev, ...newCodes];
          });
        }
        setHasMoreCodes(visibleData.hasMore || false);
      }

      if (hiddenResponse.ok) {
        const hiddenData = await hiddenResponse.json();
        // Show all hidden codes (including used codes that are automatically hidden)
        const filteredHidden = (hiddenData.codes || []).filter((code: PurchaseCode) => code.isHidden);
        if (reset) {
          // Remove duplicates when resetting
          const uniqueHidden = Array.from(
            new Map(filteredHidden.map((code: PurchaseCode) => [code.id, code])).values()
          ) as PurchaseCode[];
          setHiddenCodes(uniqueHidden);
        } else {
          // Remove duplicates when appending
          setHiddenCodes(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newCodes = filteredHidden.filter((code: PurchaseCode) => !existingIds.has(code.id));
            return [...prev, ...newCodes];
          });
        }
        setHasMoreHidden(hiddenData.hasMore || false);
      }
    } catch (error) {
      console.error("Error fetching codes:", error);
      toast.error(t("teacher.codes.errors.loadError"));
    } finally {
      setLoading(false);
      setLoadingMoreCodes(false);
      setLoadingMoreHidden(false);
    }
  };

  const handleLoadMoreCodes = async () => {
    setLoadingMoreCodes(true);
    try {
      const skipCodes = codes.length;
      const response = await fetch(`/api/teacher/codes?includeHidden=false&skip=${skipCodes}&take=25`);
      if (response.ok) {
        const data = await response.json();
        const filteredCodes = (data.codes || []).filter((code: PurchaseCode) => !code.isHidden && !code.isUsed);
        // Remove duplicates by ID
        setCodes(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newCodes = filteredCodes.filter((code: PurchaseCode) => !existingIds.has(code.id));
          return [...prev, ...newCodes];
        });
        setHasMoreCodes(data.hasMore || false);
      }
    } catch (error) {
      console.error("Error loading more codes:", error);
    } finally {
      setLoadingMoreCodes(false);
    }
  };

  const handleLoadMoreHidden = async () => {
    setLoadingMoreHidden(true);
    try {
      const skipHidden = hiddenCodes.length;
      const response = await fetch(`/api/teacher/codes?includeHidden=true&skip=${skipHidden}&take=25`);
      if (response.ok) {
        const data = await response.json();
        const filteredHidden = (data.codes || []).filter((code: PurchaseCode) => code.isHidden);
        // Remove duplicates by ID
        setHiddenCodes(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newCodes = filteredHidden.filter((code: PurchaseCode) => !existingIds.has(code.id));
          return [...prev, ...newCodes];
        });
        setHasMoreHidden(data.hasMore || false);
      }
    } catch (error) {
      console.error("Error loading more hidden codes:", error);
    } finally {
      setLoadingMoreHidden(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        const publishedCourses = data.filter((course: Course) => course.isPublished);
        setCourses(publishedCourses);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleGenerateCodes = async () => {
    if (!selectedCourse || !codeCount || parseInt(codeCount) < 1 || parseInt(codeCount) > 100) {
      toast.error(t("teacher.codes.errors.selectCourseCount"));
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/teacher/codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          count: parseInt(codeCount),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t("teacher.codes.errors.generateSuccess", { count: data.count }));
        setIsDialogOpen(false);
        setSelectedCourse("");
        setCodeCount("1");
        fetchCodes(true);
      } else {
        const error = await response.text();
        toast.error(error || t("teacher.codes.errors.generateError"));
      }
    } catch (error) {
      console.error("Error generating codes:", error);
      toast.error(t("teacher.codes.errors.generateError"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(t("teacher.codes.errors.copySuccess"));
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error(t("teacher.codes.errors.copyError"));
    }
  };

  const handleCopyAllCodes = async () => {
    if (!deleteCourseId) {
      toast.error(t("teacher.codes.copy.selectCourse"));
      return;
    }

    try {
      const response = await fetch("/api/teacher/codes/copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId: deleteCourseId }),
      });

      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.codes);
        toast.success(t("teacher.codes.copy.success", { count: data.count }));
        setIsCopyDialogOpen(false);
        setDeleteCourseId("");
      } else {
        const error = await response.text();
        toast.error(error || t("teacher.codes.errors.copyAllError"));
      }
    } catch (error) {
      console.error("Error copying codes:", error);
      toast.error(t("teacher.codes.errors.copyAllError"));
    }
  };

  const handleDeleteCodes = async () => {
    if (!deleteCourseId && selectedCodes.size === 0) {
      toast.error(t("teacher.codes.delete.description"));
      return;
    }

    try {
      const response = await fetch("/api/teacher/codes/bulk", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: deleteCourseId || undefined,
          codeIds: selectedCodes.size > 0 ? Array.from(selectedCodes) : undefined,
          action: deleteAction,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (deleteAction === "delete") {
          toast.success(t("teacher.codes.hidden.deleteSuccess", { count: data.deleted || data.hidden }));
        } else {
          toast.success(t("teacher.codes.delete.hideSuccess", { count: data.hidden }));
        }
        setIsDeleteDialogOpen(false);
        setDeleteCourseId("");
        setDeleteAction("hide");
        setSelectedCodes(new Set());
        fetchCodes(true);
      } else {
        const error = await response.text();
        toast.error(error || t("teacher.codes.errors.deleteError"));
      }
    } catch (error) {
      console.error("Error deleting codes:", error);
      toast.error(t("teacher.codes.errors.deleteError"));
    }
  };

  const handleRestoreCodes = async (codeIds: string[]) => {
    try {
      const response = await fetch("/api/teacher/codes/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ codeIds }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t("teacher.codes.hidden.restoreSuccess", { count: data.restored }));
        fetchCodes(true);
      } else {
        const error = await response.text();
        toast.error(error || t("teacher.codes.errors.restoreError"));
      }
    } catch (error) {
      console.error("Error restoring codes:", error);
      toast.error(t("teacher.codes.errors.restoreError"));
    }
  };

  const handlePermanentDelete = async (codeIds: string[]) => {
    try {
      const response = await fetch("/api/teacher/codes/bulk", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codeIds,
          action: "delete",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t("teacher.codes.hidden.deleteSuccess", { count: data.deleted }));
        fetchCodes(true);
      } else {
        const error = await response.text();
        toast.error(error || t("teacher.codes.errors.deleteError"));
      }
    } catch (error) {
      console.error("Error deleting codes:", error);
      toast.error(t("teacher.codes.errors.deleteError"));
    }
  };

  const toggleSelectAll = () => {
    if (selectedCodes.size === filteredCodes.length) {
      setSelectedCodes(new Set());
    } else {
      setSelectedCodes(new Set(filteredCodes.map((code) => code.id)));
    }
  };

  const toggleSelectCode = (codeId: string) => {
    const newSelected = new Set(selectedCodes);
    if (newSelected.has(codeId)) {
      newSelected.delete(codeId);
    } else {
      newSelected.add(codeId);
    }
    setSelectedCodes(newSelected);
  };

  // Filter codes: only show non-hidden, non-used codes
  const filteredCodes = codes.filter((code) => {
    // Ensure code is not hidden and not used
    if (code.isHidden || code.isUsed) return false;
    const matchesSearch =
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === "all" || code.courseId === courseFilter;
    return matchesSearch && matchesCourse;
  });

  // Filter hidden codes: only show hidden codes
  const filteredHiddenCodes = hiddenCodes.filter((code) => {
    // Ensure code is hidden
    if (!code.isHidden) return false;
    const matchesSearch =
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === "all" || code.courseId === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const usedCodes = filteredCodes.filter((code) => code.isUsed);
  const unusedCodes = filteredCodes.filter((code) => !code.isUsed);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t("teacher.codes.title")}</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setIsCopyDialogOpen(true)}
            variant="outline"
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">{t("teacher.codes.copy.button")}</span>
            <span className="sm:hidden">{t("teacher.codes.copy.button")}</span>
          </Button>
          <Button
            onClick={() => setIsDeleteDialogOpen(true)}
            variant="outline"
            className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700 w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("teacher.codes.delete.button")}</span>
            <span className="sm:hidden">{t("teacher.codes.delete.button")}</span>
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-brand hover:bg-brand/90 w-full sm:w-auto">
            <Plus className="h-4 w-4 sm:ml-2" />
            {t("teacher.codes.createNew")}
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder={t("teacher.codes.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Label htmlFor="course-filter" className="whitespace-nowrap text-sm">{t("teacher.codes.filterByCourse")}</Label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger id="course-filter" className="w-full sm:w-[250px]">
                  <SelectValue placeholder={t("teacher.codes.allCourses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("teacher.codes.allCourses")}</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("teacher.codes.stats.total")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("teacher.codes.stats.unused")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{unusedCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("teacher.codes.stats.used")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{usedCodes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("teacher.codes.table.code")}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("teacher.codes.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCodes.size === filteredCodes.length && filteredCodes.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left min-w-[120px]">{t("teacher.codes.table.code")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left min-w-[150px]">{t("teacher.codes.table.course")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left min-w-[100px]">{t("teacher.codes.table.status")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left min-w-[120px] hidden md:table-cell">{t("teacher.codes.table.user")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left min-w-[130px] hidden lg:table-cell">{t("teacher.codes.table.usedAt")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left min-w-[130px] hidden lg:table-cell">{t("teacher.codes.table.createdAt")}</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left w-12">{t("teacher.codes.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCodes.has(code.id)}
                          onCheckedChange={() => toggleSelectCode(code.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs sm:text-sm bg-muted px-2 py-1 rounded break-all">
                            {code.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(code.code)}
                            className="h-6 w-6 p-0 flex-shrink-0"
                          >
                            {copiedCode === code.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate" title={code.course.title}>
                          {code.course.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={code.isUsed ? "secondary" : "default"} className="text-xs">
                          {code.isUsed ? t("teacher.codes.status.used") : t("teacher.codes.status.unused")}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {code.user ? (
                          <div>
                            <div className="font-medium text-sm truncate max-w-[120px]" title={code.user.fullName}>{code.user.fullName}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]" title={code.user.phoneNumber}>{code.user.phoneNumber}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {code.usedAt
                          ? format(new Date(code.usedAt), "yyyy-MM-dd HH:mm", { locale: ar })
                          : "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {format(new Date(code.createdAt), "yyyy-MM-dd HH:mm", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(code.code)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {hasMoreCodes && !searchTerm && courseFilter === "all" && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={handleLoadMoreCodes}
                disabled={loadingMoreCodes}
              >
                {loadingMoreCodes ? t("common.loading") : t("common.showMore")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden Codes Table */}
      {hiddenCodes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-lg sm:text-xl">{t("teacher.codes.hidden.title")} ({filteredHiddenCodes.length})</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHiddenTableOpen(!isHiddenTableOpen)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                {isHiddenTableOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    {t("teacher.codes.hidden.hide")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    {t("teacher.codes.hidden.show")}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {isHiddenTableOpen && (
            <CardContent>
              {filteredHiddenCodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("teacher.codes.hidden.empty")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="rtl:text-right ltr:text-left min-w-[120px]">{t("teacher.codes.table.code")}</TableHead>
                        <TableHead className="rtl:text-right ltr:text-left min-w-[150px]">{t("teacher.codes.table.course")}</TableHead>
                        <TableHead className="rtl:text-right ltr:text-left min-w-[100px]">{t("teacher.codes.table.status")}</TableHead>
                        <TableHead className="rtl:text-right ltr:text-left min-w-[120px] hidden md:table-cell">{t("teacher.codes.table.user")}</TableHead>
                        <TableHead className="rtl:text-right ltr:text-left min-w-[130px] hidden lg:table-cell">{t("teacher.codes.table.createdAt")}</TableHead>
                        <TableHead className="rtl:text-right ltr:text-left min-w-[180px]">{t("teacher.codes.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHiddenCodes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell>
                            <code className="font-mono text-xs sm:text-sm bg-muted px-2 py-1 rounded break-all">
                              {code.code}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[150px] truncate" title={code.course.title}>
                              {code.course.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={code.isUsed ? "secondary" : "default"} className="text-xs">
                              {code.isUsed ? t("teacher.codes.status.used") : t("teacher.codes.status.unused")}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {code.user ? (
                              <div>
                                <div className="font-medium text-sm truncate max-w-[120px]" title={code.user.fullName}>{code.user.fullName}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[120px]" title={code.user.phoneNumber}>{code.user.phoneNumber}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs">
                            {format(new Date(code.createdAt), "yyyy-MM-dd HH:mm", { locale: ar })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRestoreCodes([code.id])}
                                className="flex items-center justify-center gap-1 text-xs h-8 w-full sm:w-auto"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span className="hidden sm:inline">{t("teacher.codes.hidden.restore")}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePermanentDelete([code.id])}
                                className="flex items-center justify-center gap-1 text-red-600 hover:text-red-700 text-xs h-8 w-full sm:w-auto"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span className="hidden sm:inline">{t("teacher.codes.delete.deleteButton")}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {hasMoreHidden && !searchTerm && courseFilter === "all" && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={handleLoadMoreHidden}
                    disabled={loadingMoreHidden}
                  >
                    {loadingMoreHidden ? t("common.loading") : t("common.showMore")}
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Generate Codes Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("teacher.codes.generate.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="course" className="mb-2 block">{t("teacher.codes.generate.course")}</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("teacher.codes.generate.selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="count" className="mb-2 block">{t("teacher.codes.generate.count")}</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={codeCount}
                onChange={(e) => setCodeCount(e.target.value)}
                placeholder={t("teacher.codes.generate.placeholder")}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleGenerateCodes}
              disabled={isGenerating || !selectedCourse || !codeCount}
              className="bg-brand hover:bg-brand/90 w-full sm:w-auto"
            >
              {isGenerating ? t("teacher.codes.generate.generating") : t("teacher.codes.generate.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Codes Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("teacher.codes.copy.title")}</DialogTitle>
            <DialogDescription>
              {t("teacher.codes.copy.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="copy-course" className="mb-2 block">{t("teacher.codes.copy.course")}</Label>
              <Select value={deleteCourseId} onValueChange={setDeleteCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("teacher.codes.copy.selectCourse")} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)} className="w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCopyAllCodes}
              disabled={!deleteCourseId}
              className="bg-brand hover:bg-brand/90 w-full sm:w-auto"
            >
              {t("teacher.codes.copy.buttonLabel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Codes Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("teacher.codes.delete.title")}</DialogTitle>
            <DialogDescription>
              {selectedCodes.size > 0
                ? t("teacher.codes.delete.descriptionSelected", { count: selectedCodes.size })
                : t("teacher.codes.delete.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCodes.size === 0 && (
              <div>
                <Label htmlFor="delete-course" className="mb-2 block">{t("teacher.codes.delete.course")}</Label>
                <Select value={deleteCourseId} onValueChange={setDeleteCourseId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("teacher.codes.delete.selectCourse")} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="mb-2 block">{t("teacher.codes.delete.action")}</Label>
              <RadioGroup value={deleteAction} onValueChange={(value) => setDeleteAction(value as "delete" | "hide")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hide" id="hide" />
                  <Label htmlFor="hide" className="cursor-pointer">
                    {t("teacher.codes.delete.hideOption")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delete" id="delete" />
                  <Label htmlFor="delete" className="cursor-pointer">
                    {t("teacher.codes.delete.deleteOption")}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleDeleteCodes}
              disabled={!deleteCourseId && selectedCodes.size === 0}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {deleteAction === "delete" ? t("teacher.codes.delete.deleteButton") : t("teacher.codes.delete.hideButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherCodesPage;
