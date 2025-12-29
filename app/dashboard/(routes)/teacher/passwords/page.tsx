"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, Edit, Search, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
}

const TeacherPasswordsPage = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]); // Student users
    const [staffUsers, setStaffUsers] = useState<User[]>([]); // Staff users
    const [allStaffUsers, setAllStaffUsers] = useState<User[]>([]); // All staff users (for filtering)
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [studentSearchTerm, setStudentSearchTerm] = useState("");
    const [staffSearchTerm, setStaffSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
            const response = await fetch(`/api/teacher/users?skip=0&take=10000&role=ADMIN,TEACHER`);
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
            
            const response = await fetch(`/api/teacher/users?skip=${skip}&take=${take}${searchParam}`);
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

    const handlePasswordChange = async () => {
        if (!selectedUser || !newPassword) {
            toast.error(t("teacher.passwords.errors.enterPassword"));
            return;
        }

        try {
            const response = await fetch(`/api/teacher/users/${selectedUser.id}/password`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newPassword }),
            });

            if (response.ok) {
                toast.success(t("teacher.passwords.errors.changeSuccess"));
                setNewPassword("");
                setIsDialogOpen(false);
                setSelectedUser(null);
                // Refresh both staff and student lists
                fetchStaffUsers();
                fetchUsers(true);
            } else {
                toast.error(t("teacher.passwords.errors.changeError"));
            }
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error(t("teacher.passwords.errors.changeError"));
        }
    };

    // Student users are already filtered in fetchUsers
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
                    {t("teacher.passwords.title")}
                </h1>
            </div>

            {/* Staff Table (Admins and Teachers) */}
            {staffUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("teacher.passwords.staffTitle")}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.passwords.searchPlaceholder")}
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
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.passwords.table.name")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.passwords.table.phoneNumber")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.passwords.table.role")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.passwords.table.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName}
                                        </TableCell>
                                        <TableCell>{user.phoneNumber}</TableCell>
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
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                                {t("teacher.passwords.change.button")}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Students Table */}
            {studentUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("teacher.passwords.studentsTitle")}</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.passwords.searchPlaceholder")}
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
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.passwords.table.name")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.passwords.table.phoneNumber")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.passwords.table.role")}</TableHead>
                                    <TableHead className="rtl:text-right ltr:text-left">{t("teacher.passwords.table.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentUsers.map((user) => (
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
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setIsDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                                {t("teacher.passwords.change.button")}
                                            </Button>
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
                            {t("teacher.passwords.empty")}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Single lightweight dialog rendered once */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsDialogOpen(false);
                        setNewPassword("");
                        setSelectedUser(null);
                        setShowPassword(false);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t("teacher.passwords.change.title", { name: selectedUser?.fullName || "" })}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">{t("teacher.passwords.change.newPassword")}</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t("teacher.passwords.change.placeholder")}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setNewPassword("");
                                    setSelectedUser(null);
                                }}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button onClick={handlePasswordChange}>
                                {t("teacher.passwords.change.button")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherPasswordsPage;
