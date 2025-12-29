"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Trash2, X } from "lucide-react";
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

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    role: string;
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

const UsersPage = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]); // Student users
    const [staffUsers, setStaffUsers] = useState<User[]>([]); // Staff users
    const [allStaffUsers, setAllStaffUsers] = useState<User[]>([]); // All staff users (for filtering)
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
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

    // Fetch staff users on mount (load all at once, no pagination)
    useEffect(() => {
        fetchStaffUsers();
    }, []);

    // Initial load for students (without search)
    useEffect(() => {
        fetchUsers(true);
    }, []);

    // Handler for student search submit
    const handleStudentSearch = () => {
        fetchUsers(true);
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
        fetchUsers(true);
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

    const fetchUsers = async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            
            const isSearching = studentSearchTerm.trim().length > 0;
            // When searching, load all results (no pagination). When not searching, use pagination.
            // Only fetch students (USER role)
            const skip = isSearching ? 0 : (reset ? 0 : users.length);
            const take = isSearching ? 10000 : 25; // Large limit for search to get all results
            const searchParam = studentSearchTerm.trim() ? `&search=${encodeURIComponent(studentSearchTerm.trim())}` : "";
            
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
            toast.error(t("admin.users.loadError"));
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        fetchUsers(false);
    };

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
                fetchUsers(true); // Refresh the list
                fetchStaffUsers(); // Refresh staff list
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
                fetchUsers(true); // Refresh the list
                fetchStaffUsers(); // Refresh staff list
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

    // Staff users are always loaded separately, students come from users state
    const studentUsers = users;

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

            {/* Students Table */}
            {studentUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("teacher.users.studentsTitle")}</CardTitle>
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
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
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
                                {studentUsers.map((user) => (
                                    <TableRow key={user.id}>
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
                                ))}
                            </TableBody>
                        </Table>
                        {hasMore && !studentSearchTerm && (
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
            )}

            {staffUsers.length === 0 && studentUsers.length === 0 && !loading && (
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