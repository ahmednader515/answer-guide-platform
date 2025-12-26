"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pencil, Globe } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";

const formSchema = z.object({
    title: z.string().min(1, {
        message: "العنوان مطلوب",
    }),
    description: z.string().min(1, {
        message: "الوصف مطلوب",
    }),
    grade: z.string().optional(),
});

interface CourseFormProps {
    initialData: Course;
    courseId: string;
}

export const CourseForm = ({
    initialData,
    courseId
}: CourseFormProps) => {
    const router = useRouter();
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Normalize grade value - handle old/invalid values
    const normalizeGradeValue = (grade: string | null | undefined): string => {
        if (!grade) return "ALL_GRADES";
        const trimmed = grade.trim();
        // Check if it's a valid Arabic grade value
        if (trimmed === "الأول الثانوي" || trimmed === "الثاني الثانوي" || trimmed === "الثالث الثانوي") {
            return trimmed;
        }
        // Handle old English values for backward compatibility
        const normalized = trimmed.toUpperCase();
        if (normalized === "FIRST_SECONDARY") return "الأول الثانوي";
        if (normalized === "SECOND_SECONDARY") return "الثاني الثانوي";
        if (normalized === "THIRD_SECONDARY") return "الثالث الثانوي";
        // For old/invalid values, return "ALL_GRADES" (will show as "All Grades")
        return "ALL_GRADES";
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData.title || "",
            description: initialData.description || "",
            grade: normalizeGradeValue((initialData as any).grade),
        },
    });

    const toggleEdit = () => setIsEditing((current) => !current);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsLoading(true);
            // Convert "ALL_GRADES" to null for database
            const submitValues = {
                ...values,
                grade: values.grade && values.grade !== "ALL_GRADES" ? values.grade : null,
            };
            await axios.patch(`/api/courses/${courseId}`, submitValues);
            toast.success("تم تحديث الكورس");
            toggleEdit();
            router.refresh();
        } catch {
            toast.error("حدث خطأ ما");
        } finally {
            setIsLoading(false);
        }
    }

    const onPublish = async () => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}/publish`);
            toast.success(initialData.isPublished ? "تم إلغاء النشر" : "تم النشر");
            router.refresh();
        } catch {
            toast.error("حدث خطأ ما");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="mt-6 border bg-slate-100 rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                إعدادات الكورس
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing ? (
                        <>إلغاء</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            تعديل الكورس
                        </>
                    )}
                </Button>
            </div>
            {!isEditing && (
                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm text-slate-500">
                                {initialData.isPublished ? "منشور" : "مسودة"}
                            </p>
                            <p className="text-sm text-slate-600">
                                {t("auth.grade")}: {
                                    (() => {
                                        const grade = (initialData as any).grade;
                                        if (!grade || !grade.trim()) return t("auth.grades.allGrades");
                                        const trimmed = grade.trim();
                                        // Check Arabic values first
                                        if (trimmed === "الأول الثانوي") return t("auth.grades.firstSecondary");
                                        if (trimmed === "الثاني الثانوي") return t("auth.grades.secondSecondary");
                                        if (trimmed === "الثالث الثانوي") return t("auth.grades.thirdSecondary");
                                        // Handle old English values for backward compatibility
                                        const normalized = trimmed.toUpperCase();
                                        if (normalized === "FIRST_SECONDARY") return t("auth.grades.firstSecondary");
                                        if (normalized === "SECOND_SECONDARY") return t("auth.grades.secondSecondary");
                                        if (normalized === "THIRD_SECONDARY") return t("auth.grades.thirdSecondary");
                                        return t("auth.grades.allGrades");
                                    })()
                                }
                            </p>
                        </div>
                        <Button
                            onClick={onPublish}
                            disabled={isLoading}
                            variant={initialData.isPublished ? "destructive" : "default"}
                        >
                            <Globe className="h-4 w-4 mr-2" />
                            {initialData.isPublished ? "إلغاء النشر" : "نشر"}
                        </Button>
                    </div>
                </div>
            )}
            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            disabled={isLoading}
                                            placeholder="e.g. 'تطوير الويب '"
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
                                    <FormLabel>الوصف</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={isLoading}
                                            placeholder="e.g. 'هذه الكورس سوف تعلمك...'"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="grade"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("auth.grade")}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("auth.selectGrade")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ALL_GRADES">{t("auth.grades.allGrades")}</SelectItem>
                                            <SelectItem value="الأول الثانوي">{t("auth.grades.firstSecondary")}</SelectItem>
                                            <SelectItem value="الثاني الثانوي">{t("auth.grades.secondSecondary")}</SelectItem>
                                            <SelectItem value="الثالث الثانوي">{t("auth.grades.thirdSecondary")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button
                                disabled={isLoading}
                                type="submit"
                            >
                                حفظ
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
} 