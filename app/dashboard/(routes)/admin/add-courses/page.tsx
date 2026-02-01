"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, User, Plus, X, Lock, Unlock, FileText } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    _count?: {
        purchases: number;
    };
}

interface Course {
    id: string;
    title: string;
    price: number;
    isPublished: boolean;
}

interface Chapter {
    id: string;
    title: string;
    position: number;
    isPublished: boolean;
    isFree: boolean;
}

const AddCoursesPage = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [ownedCourses, setOwnedCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"add" | "delete">("add");
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [isDeletingCourse, setIsDeletingCourse] = useState(false);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [chapterAccesses, setChapterAccesses] = useState<Set<string>>(new Set());
    const [loadingChapters, setLoadingChapters] = useState(false);
    const [processingChapters, setProcessingChapters] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchCourses();
    }, []);

    // Initial load (without search)
    useEffect(() => {
        fetchUsers(true);
    }, []);

    // Handler for search submit
    const handleSearch = () => {
        fetchUsers(true);
    };

    // Handler to clear search
    const handleClearSearch = () => {
        setSearchTerm("");
        fetchUsers(true);
    };

    useEffect(() => {
        // fetch owned courses when a user is selected for delete mode
        const fetchOwned = async () => {
            if (!selectedUser) {
                setOwnedCourses([]);
                return;
            }
            try {
                const res = await fetch(`/api/admin/users/${selectedUser.id}/courses`);
                if (res.ok) {
                    const data = await res.json();
                    setOwnedCourses(data.courses || []);
                }
            } catch (e) {
                console.error("Error fetching owned courses", e);
            }
        };
        fetchOwned();
    }, [selectedUser]);

    // Fetch chapters when course is selected
    useEffect(() => {
        const fetchChapters = async () => {
            if (!selectedCourse) {
                setChapters([]);
                setChapterAccesses(new Set());
                return;
            }
            setLoadingChapters(true);
            try {
                const [chaptersRes, accessesRes] = await Promise.all([
                    fetch(`/api/courses/${selectedCourse}/chapters`),
                    selectedUser ? fetch(`/api/admin/users/${selectedUser.id}/chapter-accesses?courseId=${selectedCourse}`) : Promise.resolve(null)
                ]);
                
                if (chaptersRes.ok) {
                    const chaptersData = await chaptersRes.json();
                    setChapters(chaptersData.filter((ch: Chapter) => ch.isPublished));
                }
                
                if (accessesRes && accessesRes.ok) {
                    const accessesData = await accessesRes.json();
                    setChapterAccesses(new Set(accessesData.map((a: { chapterId: string }) => a.chapterId)));
                }
            } catch (e) {
                console.error("Error fetching chapters", e);
            } finally {
                setLoadingChapters(false);
            }
        };
        fetchChapters();
    }, [selectedCourse, selectedUser]);

    const fetchUsers = async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            
            const isSearching = searchTerm.trim().length > 0;
            // When searching, load all results (no pagination). When not searching, use pagination.
            const skip = isSearching ? 0 : (reset ? 0 : users.length);
            const take = isSearching ? 10000 : 25; // Large limit for search to get all results
            const searchParam = searchTerm.trim() ? `&search=${encodeURIComponent(searchTerm.trim())}` : "";
            
            const response = await fetch(`/api/admin/users?skip=${skip}&take=${take}${searchParam}`);
            if (response.ok) {
                const data = await response.json();
                // Filter only students
                const studentUsers = (data.users || []).filter((user: User) => user.role === "USER");
                if (reset || isSearching) {
                    // When resetting or searching, replace all users
                    setUsers(studentUsers);
                } else {
                    // When loading more (not searching), append users
                    setUsers(prev => [...prev, ...studentUsers]);
                }
                // When searching, there's no "more" to load. When not searching, check hasMore.
                setHasMore(isSearching ? false : (data.hasMore || false));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        fetchUsers(false);
    };

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                // Filter only published courses
                const publishedCourses = data.filter((course: Course) => course.isPublished);
                setCourses(publishedCourses);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleAddCourse = async () => {
        if (!selectedUser || !selectedCourse) {
            toast.error(t("admin.addCourses.errors.selectStudentCourse"));
            return;
        }

        setIsAddingCourse(true);
        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/add-course`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ courseId: selectedCourse }),
            });

            if (response.ok) {
                toast.success(t("admin.addCourses.errors.addSuccess"));
                setIsDialogOpen(false);
                setSelectedUser(null);
                setSelectedCourse("");
            } else {
                const error = await response.json();
                toast.error(error.message || t("admin.addCourses.errors.addError"));
            }
        } catch (error) {
            console.error("Error adding course:", error);
            toast.error(t("admin.addCourses.errors.addError"));
        } finally {
            setIsAddingCourse(false);
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedUser || !selectedCourse) {
            toast.error(t("admin.addCourses.errors.selectStudentCourse"));
            return;
        }

        setIsDeletingCourse(true);
        try {
            const res = await fetch(`/api/admin/users/${selectedUser.id}/add-course`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId: selectedCourse })
            });
            if (res.ok) {
                toast.success(t("admin.addCourses.errors.deleteSuccess"));
                setIsDialogOpen(false);
                setSelectedCourse("");
                setSelectedUser(null);
                fetchUsers(true);
            } else {
                const data = await res.json().catch(() => ({} as any));
                toast.error((data as any).error || t("admin.addCourses.errors.deleteError"));
            }
        } catch (error) {
            console.error("Error deleting course:", error);
            toast.error(t("admin.addCourses.errors.deleteError"));
        } finally {
            setIsDeletingCourse(false);
        }
    };

    const handleAddChapter = async (chapterId: string) => {
        if (!selectedUser) return;
        
        setProcessingChapters(prev => new Set(prev).add(chapterId));
        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/add-chapter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapterId })
            });
            
            if (response.ok) {
                toast.success(t("admin.addCourses.chapters.addSuccess"));
                setChapterAccesses(prev => new Set(prev).add(chapterId));
            } else {
                const error = await response.json();
                toast.error(error.error || t("admin.addCourses.chapters.addError"));
            }
        } catch (error) {
            console.error("Error adding chapter:", error);
            toast.error(t("admin.addCourses.chapters.addError"));
        } finally {
            setProcessingChapters(prev => {
                const newSet = new Set(prev);
                newSet.delete(chapterId);
                return newSet;
            });
        }
    };

    const handleRemoveChapter = async (chapterId: string) => {
        if (!selectedUser) return;
        
        setProcessingChapters(prev => new Set(prev).add(chapterId));
        try {
            const response = await fetch(`/api/admin/users/${selectedUser.id}/add-chapter`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapterId })
            });
            
            if (response.ok) {
                toast.success(t("admin.addCourses.chapters.removeSuccess"));
                setChapterAccesses(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(chapterId);
                    return newSet;
                });
            } else {
                const error = await response.json();
                toast.error(error.error || t("admin.addCourses.chapters.removeError"));
            }
        } catch (error) {
            console.error("Error removing chapter:", error);
            toast.error(t("admin.addCourses.chapters.removeError"));
        } finally {
            setProcessingChapters(prev => {
                const newSet = new Set(prev);
                newSet.delete(chapterId);
                return newSet;
            });
        }
    };

    // No client-side filtering - server handles search
    const filteredUsers = users;

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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t("admin.addCourses.title")}
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("admin.addCourses.studentsTitle")}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("admin.addCourses.searchPlaceholder")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSearch();
                                    }
                                }}
                                className="max-w-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSearch}
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearSearch}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.addCourses.table.name")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.addCourses.table.phoneNumber")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.addCourses.table.role")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.addCourses.table.purchasedCourses")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("admin.addCourses.table.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        {user.fullName}
                                    </TableCell>
                                    <TableCell>{user.phoneNumber}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {t("teacher.users.roles.student")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{user._count?.purchases ?? 0}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setDialogMode("add");
                                                    setSelectedCourse("");
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Plus className="h-4 w-4" />
                                                {t("admin.addCourses.add.button")}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setDialogMode("delete");
                                                    setSelectedCourse("");
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                {t("admin.addCourses.delete.button")}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {hasMore && !searchTerm && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    variant="outline"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? t("common.loading") : t("common.showMore")}
                                </Button>
                            </div>
                        )}
                    </CardContent>
            </Card>
            {/* Single lightweight dialog rendered once */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setSelectedCourse("");
                        setSelectedUser(null);
                        setDialogMode("add");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === "add" ? (
                                <>{t("admin.addCourses.add.title", { name: selectedUser?.fullName || "" })}</>
                            ) : (
                                <>{t("admin.addCourses.delete.title", { name: selectedUser?.fullName || "" })}</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("admin.addCourses.add.selectCourse")}</label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("admin.addCourses.add.selectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(dialogMode === "delete" ? ownedCourses : courses).map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{course.title}</span>
                                                {typeof course.price === "number" && (
                                                    <Badge variant="outline" className="mr-2">
                                                        {course.price} {t("admin.balances.egp")}
                                                    </Badge>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Course-level actions */}
                        <div className="flex justify-end space-x-2 pt-2 border-t">
                            {dialogMode === "add" ? (
                                <Button 
                                    onClick={handleAddCourse}
                                    disabled={!selectedCourse || isAddingCourse}
                                >
                                    {isAddingCourse ? t("admin.addCourses.add.adding") : t("admin.addCourses.add.addCourse")}
                                </Button>
                            ) : (
                                <Button 
                                    variant="destructive"
                                    onClick={handleDeleteCourse}
                                    disabled={!selectedCourse || isDeletingCourse}
                                >
                                    {isDeletingCourse ? t("admin.addCourses.delete.deleting") : t("admin.addCourses.delete.button")}
                                </Button>
                            )}
                        </div>

                        {/* Chapters section */}
                        {selectedCourse && (
                            <div className="space-y-2 pt-4 border-t">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {t("admin.addCourses.chapters.title")}
                                </label>
                                {loadingChapters ? (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                        {t("common.loading")}
                                    </div>
                                ) : chapters.length === 0 ? (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                        {t("admin.addCourses.chapters.empty")}
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {chapters.map((chapter) => {
                                            const hasAccess = chapterAccesses.has(chapter.id);
                                            const isProcessing = processingChapters.has(chapter.id);
                                            return (
                                                <div
                                                    key={chapter.id}
                                                    className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50"
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {hasAccess ? (
                                                            <Unlock className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                        ) : (
                                                            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        )}
                                                        <span className="text-sm truncate">{chapter.title}</span>
                                                        {chapter.isFree && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {t("course.free")}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant={hasAccess ? "destructive" : "default"}
                                                        onClick={() => hasAccess ? handleRemoveChapter(chapter.id) : handleAddChapter(chapter.id)}
                                                        disabled={isProcessing}
                                                        className="ml-2 flex-shrink-0"
                                                    >
                                                        {isProcessing ? (
                                                            t("common.loading")
                                                        ) : hasAccess ? (
                                                            <>
                                                                <X className="h-3 w-3 mr-1" />
                                                                {t("admin.addCourses.chapters.remove")}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="h-3 w-3 mr-1" />
                                                                {t("admin.addCourses.chapters.add")}
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end space-x-2 pt-2 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setSelectedCourse("");
                                    setSelectedUser(null);
                                    setDialogMode("add");
                                    setChapters([]);
                                    setChapterAccesses(new Set());
                                }}
                            >
                                {t("common.cancel")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AddCoursesPage; 