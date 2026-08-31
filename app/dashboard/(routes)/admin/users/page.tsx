"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const GRADE_OPTIONS = [
    { value: "الأول الثانوي", labelKey: "auth.grades.firstSecondary" },
    { value: "الثاني الثانوي", labelKey: "auth.grades.secondSecondary" },
    { value: "الثالث الثانوي", labelKey: "auth.grades.thirdSecondary" },
] as const;

type GradeValue = (typeof GRADE_OPTIONS)[number]["value"];

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
    grade: string | null;
    balance: number;
    createdAt: string;
    updatedAt: string;
    _count: {
        courses: number;
        purchases: number;
        userProgress: number;
    };
}

interface EditUserData {
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
}

interface GradeTableState {
    users: User[];
    hasMore: boolean;
    loadingMore: boolean;
    selectAllMode: boolean;
    total: number;
}

const createInitialGradeTables = (): Record<GradeValue, GradeTableState> => ({
    "الأول الثانوي": { users: [], hasMore: false, loadingMore: false, selectAllMode: false, total: 0 },
    "الثاني الثانوي": { users: [], hasMore: false, loadingMore: false, selectAllMode: false, total: 0 },
    "الثالث الثانوي": { users: [], hasMore: false, loadingMore: false, selectAllMode: false, total: 0 },
});

const UsersPage = () => {
    const { t } = useLanguage();
    const [gradeTables, setGradeTables] = useState<Record<GradeValue, GradeTableState>>(createInitialGradeTables);
    const [staffUsers, setStaffUsers] = useState<User[]>([]);
    const [allStaffUsers, setAllStaffUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentSearchTerm, setStudentSearchTerm] = useState("");
    const [staffSearchTerm, setStaffSearchTerm] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editData, setEditData] = useState<EditUserData>({
        fullName: "",
        phoneNumber: "",
        parentPhoneNumber: "",
        role: ""
    });
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [bulkDeletingGrade, setBulkDeletingGrade] = useState<GradeValue | null>(null);

    const apiBase = "/api/admin/users";

    const getStudentSearchParam = (term?: string) => {
        const value = term !== undefined ? term : studentSearchTerm;
        return value.trim() ? `&search=${encodeURIComponent(value.trim())}` : "";
    };

    const buildGradeUsersUrl = (grade: GradeValue, skip: number, take: number, searchTerm?: string) =>
        `${apiBase}?skip=${skip}&take=${take}&role=USER&grade=${encodeURIComponent(grade)}${getStudentSearchParam(searchTerm)}`;

    // Fetch staff users on mount (load all at once, no pagination)
    useEffect(() => {
        fetchStaffUsers();
    }, []);

    // Initial load for students (without search)
    useEffect(() => {
        fetchAllGradeUsers(true);
    }, []);

    const handleStudentSearch = () => {
        fetchAllGradeUsers(true);
    };

    // Handler for staff search submit (client-side filtering)
    const handleStaffSearch = () => {
        if (staffSearchTerm.trim()) {
            const filtered = allStaffUsers.filter((user: User) =>
                user.fullName.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
                user.phoneNumber.includes(staffSearchTerm)
            );
            setStaffUsers(filtered);
        } else {
            // When search is cleared, show all staff users
            setStaffUsers(allStaffUsers);
        }
    };

    // Handler to clear student search
    const handleClearStudentSearch = () => {
        setStudentSearchTerm("");
        fetchAllGradeUsers(true, "");
    };

    // Handler to clear staff search
    const handleClearStaffSearch = () => {
        setStaffSearchTerm("");
        setStaffUsers(allStaffUsers);
    };

    const fetchStaffUsers = async () => {
        try {
            // Load all staff users at once (no pagination - there are only 2)
            // Use role filter to only fetch ADMIN and TEACHER users from database
            const response = await fetch(`/api/admin/users?skip=0&take=10000&role=ADMIN,TEACHER`);
            if (response.ok) {
                const data = await response.json();
                const staff = data.users || []; // Already filtered by role in database
                setAllStaffUsers(staff);
                // Apply current search filter if any
                if (staffSearchTerm.trim()) {
                    const filtered = staff.filter((user: User) =>
                        user.fullName.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
                        user.phoneNumber.includes(staffSearchTerm)
                    );
                    setStaffUsers(filtered);
                } else {
                    setStaffUsers(staff);
                }
            }
        } catch (error) {
            console.error("Error fetching staff users:", error);
        }
    };

    const fetchGradeUsers = async (
        grade: GradeValue,
        reset = false,
        searchOverride?: string,
        explicitSkip?: number
    ) => {
        const searchTerm = searchOverride !== undefined ? searchOverride : studentSearchTerm;
        const isSearching = searchTerm.trim().length > 0;

        if (reset) {
            setGradeTables((prev) => ({
                ...prev,
                [grade]: { ...prev[grade], loadingMore: false, selectAllMode: false },
            }));
        } else {
            setGradeTables((prev) => ({
                ...prev,
                [grade]: { ...prev[grade], loadingMore: true },
            }));
        }

        try {
            const skip = isSearching ? 0 : (reset ? 0 : (explicitSkip ?? 0));
            const take = isSearching ? 10000 : 25;

            const response = await fetch(buildGradeUsersUrl(grade, skip, take, searchTerm));
            if (response.ok) {
                const data = await response.json();
                const studentUsers = (data.users || []).filter((user: User) => user.role === "USER");

                setGradeTables((prev) => ({
                    ...prev,
                    [grade]: {
                        users: reset || isSearching ? studentUsers : [...prev[grade].users, ...studentUsers],
                        hasMore: isSearching ? false : (data.hasMore || false),
                        loadingMore: false,
                        selectAllMode: reset ? false : prev[grade].selectAllMode,
                        total: data.total ?? studentUsers.length,
                    },
                }));
            } else {
                toast.error(t("admin.users.loadError"));
                setGradeTables((prev) => ({
                    ...prev,
                    [grade]: { ...prev[grade], loadingMore: false },
                }));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(t("admin.users.loadError"));
            setGradeTables((prev) => ({
                ...prev,
                [grade]: { ...prev[grade], loadingMore: false },
            }));
        }
    };

    const fetchAllGradeUsers = async (reset = false, searchOverride?: string) => {
        try {
            if (reset) {
                setLoading(true);
                setSelectedStudents(new Set());
            }
            await Promise.all(GRADE_OPTIONS.map((grade) => fetchGradeUsers(grade.value, reset, searchOverride)));
        } finally {
            if (reset) {
                setLoading(false);
            }
        }
    };

    const handleLoadMore = (grade: GradeValue) => {
        fetchGradeUsers(grade, false, undefined, gradeTables[grade].users.length);
    };

    const fetchAllStudentsInGrade = async (grade: GradeValue): Promise<User[]> => {
        const response = await fetch(buildGradeUsersUrl(grade, 0, 10000));
        if (!response.ok) {
            throw new Error("Failed to fetch students");
        }
        const data = await response.json();
        return (data.users || []).filter((user: User) => user.role === "USER");
    };

    const hasAnyStudents = GRADE_OPTIONS.some((grade) => gradeTables[grade.value].total > 0);

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditData({
            fullName: user.fullName,
            phoneNumber: user.phoneNumber,
            parentPhoneNumber: user.parentPhoneNumber,
            role: user.role
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editData),
            });

            if (response.ok) {
                toast.success(t("admin.users.errors.updateSuccess"));
                setIsEditDialogOpen(false);
                setEditingUser(null);
                fetchAllGradeUsers(true);
                fetchStaffUsers();
            } else {
                const error = await response.text();
                toast.error(error || t("admin.users.errors.updateError"));
            }
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error(t("admin.users.errors.updateError"));
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success(t("admin.users.errors.deleteSuccess"));
                fetchAllGradeUsers(true);
                fetchStaffUsers();
            } else {
                const error = await response.text();
                toast.error(error || t("admin.users.errors.deleteError"));
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(t("admin.users.errors.deleteError"));
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleStudentSelection = (userId: string, grade: GradeValue) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
            setGradeTables((prev) => ({
                ...prev,
                [grade]: { ...prev[grade], selectAllMode: false },
            }));
        } else {
            newSelected.add(userId);
        }
        setSelectedStudents(newSelected);
    };

    const isGradeFullySelected = (grade: GradeValue) => {
        const gradeState = gradeTables[grade];
        if (gradeState.selectAllMode) return true;
        return (
            gradeState.users.length > 0 &&
            gradeState.users.every((user) => selectedStudents.has(user.id)) &&
            !gradeState.hasMore
        );
    };

    const toggleSelectAllInGrade = async (grade: GradeValue) => {
        const isFullySelected = isGradeFullySelected(grade);

        try {
            const allStudents = await fetchAllStudentsInGrade(grade);
            const allIds = allStudents.map((user) => user.id);
            const newSelected = new Set(selectedStudents);

            if (isFullySelected) {
                allIds.forEach((id) => newSelected.delete(id));
                setSelectedStudents(newSelected);
                setGradeTables((prev) => ({
                    ...prev,
                    [grade]: { ...prev[grade], selectAllMode: false },
                }));
            } else {
                allIds.forEach((id) => newSelected.add(id));
                setSelectedStudents(newSelected);
                setGradeTables((prev) => ({
                    ...prev,
                    [grade]: { ...prev[grade], selectAllMode: true },
                }));
                if (allIds.length > 0) {
                    toast.success(`${allIds.length} ${t("common.selected")}`);
                }
            }
        } catch (error) {
            console.error("Error selecting all students in grade:", error);
            toast.error(t("admin.users.loadError"));
        }
    };

    const getSelectedCountInGrade = (grade: GradeValue) => {
        const gradeState = gradeTables[grade];
        if (gradeState.selectAllMode) return gradeState.total;
        return gradeState.users.filter((user) => selectedStudents.has(user.id)).length;
    };

    const getSelectedIdsInGrade = async (grade: GradeValue): Promise<string[]> => {
        const gradeState = gradeTables[grade];
        if (gradeState.selectAllMode) {
            const allStudents = await fetchAllStudentsInGrade(grade);
            return allStudents.map((user) => user.id);
        }
        return gradeState.users
            .filter((user) => selectedStudents.has(user.id))
            .map((user) => user.id);
    };

    const handleBulkDeleteInGrade = async (grade: GradeValue) => {
        setBulkDeletingGrade(grade);
        try {
            const userIds = await getSelectedIdsInGrade(grade);
            if (userIds.length === 0) return;

            const deletePromises = userIds.map((userId) =>
                fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
            );

            const results = await Promise.all(deletePromises);
            const allSuccess = results.every((r) => r.ok);

            if (allSuccess) {
                toast.success(t("admin.users.errors.bulkDeleteSuccess"));
                setSelectedStudents((prev) => {
                    const next = new Set(prev);
                    userIds.forEach((id) => next.delete(id));
                    return next;
                });
                setGradeTables((prev) => ({
                    ...prev,
                    [grade]: { ...prev[grade], selectAllMode: false },
                }));
                fetchAllGradeUsers(true);
                fetchStaffUsers();
            } else {
                toast.error(t("admin.users.errors.deleteError"));
            }
        } catch (error) {
            console.error("Error bulk deleting students in grade:", error);
            toast.error(t("admin.users.errors.deleteError"));
        } finally {
            setBulkDeletingGrade(null);
        }
    };

    const handleBulkDeleteStudents = async () => {
        setIsBulkDeleting(true);
        try {
            const userIds = Array.from(selectedStudents);
            const deletePromises = userIds.map(userId =>
                fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
            );

            const results = await Promise.all(deletePromises);
            const allSuccess = results.every(r => r.ok);

            if (allSuccess) {
                toast.success(t("admin.users.errors.bulkDeleteSuccess"));
                setSelectedStudents(new Set());
                fetchAllGradeUsers(true);
                fetchStaffUsers();
            } else {
                toast.error(t("admin.users.errors.deleteError"));
            }
        } catch (error) {
            console.error("Error bulk deleting students:", error);
            toast.error(t("admin.users.errors.deleteError"));
        } finally {
            setIsBulkDeleting(false);
        }
    };

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
                    {t("admin.users.title")}
                </h1>
            </div>

            {/* Staff Table (Admins and Teachers) - Always visible */}
            {staffUsers.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("teacher.users.staffTitle")}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.users.searchPlaceholder")}
                                value={staffSearchTerm}
                                onChange={(e) => setStaffSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleStaffSearch();
                                    }
                                }}
                                className="max-w-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleStaffSearch}
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                            {staffSearchTerm && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearStaffSearch}
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
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.name")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.phoneNumber")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.parentPhoneNumber")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.role")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.registrationDate")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
                                        <TableCell>{user.parentPhoneNumber}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary"
                                                className={
                                                    user.role === "ADMIN" ? "bg-orange-600 text-white hover:bg-orange-700" : 
                                                    user.role === "TEACHER" ? "bg-blue-600 text-white hover:bg-blue-700" : 
                                                    ""
                                                }
                                            >
                                                {user.role === "TEACHER" ? t("teacher.users.roles.teacher") : 
                                                 user.role === "ADMIN" ? t("teacher.users.roles.admin") : user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                    if (!open) {
                                                        setIsEditDialogOpen(false);
                                                        setEditingUser(null);
                                                    }
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditUser(user)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>{t("admin.users.edit.title")}</DialogTitle>
                                                            <DialogDescription>
                                                                {t("admin.users.edit.description")}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="fullName" className="text-right">
                                                                    {t("auth.fullName")}
                                                                </Label>
                                                                <Input
                                                                    id="fullName"
                                                                    value={editData.fullName}
                                                                    onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="phoneNumber" className="text-right">
                                                                    {t("auth.phoneNumber")}
                                                                </Label>
                                                                <Input
                                                                    id="phoneNumber"
                                                                    value={editData.phoneNumber}
                                                                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                    {t("auth.parentPhoneNumber")}
                                                                </Label>
                                                                <Input
                                                                    id="parentPhoneNumber"
                                                                    value={editData.parentPhoneNumber}
                                                                    onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                    className="col-span-3"
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-4 items-center gap-4">
                                                                <Label htmlFor="role" className="text-right">
                                                                    {t("admin.users.table.role")}
                                                                </Label>
                                                                <Select
                                                                    value={editData.role}
                                                                    onValueChange={(value) => setEditData({...editData, role: value})}
                                                                >
                                                                    <SelectTrigger className="col-span-3">
                                                                        <SelectValue placeholder={t("admin.users.edit.selectRole")} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="USER">{t("teacher.users.roles.student")}</SelectItem>
                                                                        <SelectItem value="TEACHER">{t("teacher.users.roles.teacher")}</SelectItem>
                                                                        <SelectItem value="ADMIN">{t("teacher.users.roles.admin")}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => {
                                                                setIsEditDialogOpen(false);
                                                                setEditingUser(null);
                                                            }}>
                                                                {t("common.cancel")}
                                                            </Button>
                                                            <Button onClick={handleSaveUser}>
                                                                {t("admin.users.edit.saveChanges")}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isDeleting}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>{t("admin.users.delete.confirm")}</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                {t("admin.users.delete.description")}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                {t("common.delete")}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : null}

            {/* Students Tables by Grade */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">{t("teacher.users.studentsTitle")}</h2>
                    {selectedStudents.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {selectedStudents.size} {t("common.selected")}
                            </span>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={isBulkDeleting}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {t("common.deleteSelected")}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t("admin.users.delete.confirm")}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t("admin.users.delete.bulkDescription", { count: selectedStudents.size })}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleBulkDeleteStudents}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {t("common.delete")}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("teacher.users.searchPlaceholder")}
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleStudentSearch();
                            }
                        }}
                        className="max-w-sm"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStudentSearch}
                    >
                        <Search className="h-4 w-4" />
                    </Button>
                    {studentSearchTerm && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearStudentSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {GRADE_OPTIONS.map((gradeOption) => {
                    const gradeState = gradeTables[gradeOption.value];
                    const gradeStudents = gradeState.users;
                    const selectedInGrade = getSelectedCountInGrade(gradeOption.value);

                    return (
                        <Card key={gradeOption.value}>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <Label className="shrink-0">{t("auth.grade")}</Label>
                                    <Select value={gradeOption.value}>
                                        <SelectTrigger className="max-w-xs" disabled>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GRADE_OPTIONS.map((grade) => (
                                                <SelectItem key={grade.value} value={grade.value}>
                                                    {t(grade.labelKey)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-muted-foreground">
                                        ({gradeState.total})
                                    </span>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={selectedInGrade === 0 || bulkDeletingGrade === gradeOption.value}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {selectedInGrade > 0 && (
                                                    <span className="ms-2">{selectedInGrade}</span>
                                                )}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t("admin.users.delete.confirm")}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {t("admin.users.delete.bulkDescription", { count: selectedInGrade })}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleBulkDeleteInGrade(gradeOption.value)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    {t("common.delete")}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={isGradeFullySelected(gradeOption.value)}
                                                    onCheckedChange={() => toggleSelectAllInGrade(gradeOption.value)}
                                                    disabled={gradeState.total === 0}
                                                />
                                            </TableHead>
                                            <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.name")}</TableHead>
                                            <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.phoneNumber")}</TableHead>
                                            <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.parentPhoneNumber")}</TableHead>
                                            <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.role")}</TableHead>
                                            <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.balance")}</TableHead>
                                            <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.purchasedCourses")}</TableHead>
                                            <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.registrationDate")}</TableHead>
                                            <TableHead className="rtl:text-right ltr:text-left">{t("admin.users.table.actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {gradeStudents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                                    {t("admin.users.empty")}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            gradeStudents.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="w-12">
                                                        <Checkbox
                                                            checked={selectedStudents.has(user.id)}
                                                            onCheckedChange={() => toggleStudentSelection(user.id, gradeOption.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {user.fullName}
                                                    </TableCell>
                                                    <TableCell>{user.phoneNumber}</TableCell>
                                                    <TableCell>{user.parentPhoneNumber}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {t("teacher.users.roles.student")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {user.balance} {t("dashboard.egp")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {user._count.purchases}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ar })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                                                if (!open) {
                                                                    setIsEditDialogOpen(false);
                                                                    setEditingUser(null);
                                                                }
                                                            }}>
                                                                <DialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEditUser(user)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>{t("admin.users.edit.title")}</DialogTitle>
                                                                        <DialogDescription>
                                                                            {t("admin.users.edit.description")}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="grid gap-4 py-4">
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="fullName" className="text-right">
                                                                                {t("auth.fullName")}
                                                                            </Label>
                                                                            <Input
                                                                                id="fullName"
                                                                                value={editData.fullName}
                                                                                onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="phoneNumber" className="text-right">
                                                                                {t("auth.phoneNumber")}
                                                                            </Label>
                                                                            <Input
                                                                                id="phoneNumber"
                                                                                value={editData.phoneNumber}
                                                                                onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="parentPhoneNumber" className="text-right">
                                                                                {t("auth.parentPhoneNumber")}
                                                                            </Label>
                                                                            <Input
                                                                                id="parentPhoneNumber"
                                                                                value={editData.parentPhoneNumber}
                                                                                onChange={(e) => setEditData({...editData, parentPhoneNumber: e.target.value})}
                                                                                className="col-span-3"
                                                                            />
                                                                        </div>
                                                                        <div className="grid grid-cols-4 items-center gap-4">
                                                                            <Label htmlFor="role" className="text-right">
                                                                                {t("admin.users.table.role")}
                                                                            </Label>
                                                                            <Select
                                                                                value={editData.role}
                                                                                onValueChange={(value) => setEditData({...editData, role: value})}
                                                                            >
                                                                                <SelectTrigger className="col-span-3">
                                                                                    <SelectValue placeholder={t("admin.users.edit.selectRole")} />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="USER">{t("teacher.users.roles.student")}</SelectItem>
                                                                                    <SelectItem value="TEACHER">{t("teacher.users.roles.teacher")}</SelectItem>
                                                                                    <SelectItem value="ADMIN">{t("teacher.users.roles.admin")}</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <Button variant="outline" onClick={() => {
                                                                            setIsEditDialogOpen(false);
                                                                            setEditingUser(null);
                                                                        }}>
                                                                            {t("common.cancel")}
                                                                        </Button>
                                                                        <Button onClick={handleSaveUser}>
                                                                            {t("admin.users.edit.saveChanges")}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                            
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        disabled={isDeleting}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>{t("admin.users.delete.confirm")}</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            {t("admin.users.delete.description")}
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDeleteUser(user.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            {t("common.delete")}
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                {gradeState.hasMore && !studentSearchTerm && (
                                    <div className="flex justify-center mt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleLoadMore(gradeOption.value)}
                                            disabled={gradeState.loadingMore}
                                        >
                                            {gradeState.loadingMore ? t("common.loading") : t("common.showMore")}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {staffUsers.length === 0 && !hasAnyStudents && !loading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">
                            {t("admin.users.empty")}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default UsersPage; 