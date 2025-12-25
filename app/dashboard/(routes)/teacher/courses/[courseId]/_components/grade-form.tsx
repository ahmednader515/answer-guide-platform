"use client"

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Course } from "@prisma/client";
import { useLanguage } from "@/lib/contexts/language-context";

interface GradeFormProps {
    initialData: Course;
    courseId: string;
}

const formSchema = z.object({
    grade: z.string().optional(),
});

export const GradeForm = ({
    initialData,
    courseId
}: GradeFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);

    const toggleEdit = () => setIsEditing((current) => !current);

    const router = useRouter();

    // Normalize grade value - handle old/invalid values
    const normalizeGradeValue = (grade: string | null | undefined): string => {
        if (!grade) return "ALL_GRADES";
        const normalized = grade.trim().toUpperCase();
        // Check if it's a valid grade value
        if (["FIRST_SECONDARY", "SECOND_SECONDARY", "THIRD_SECONDARY"].includes(normalized)) {
            return normalized;
        }
        // For old/invalid values, return "ALL_GRADES" (will show as "All Grades")
        return "ALL_GRADES";
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            grade: normalizeGradeValue((initialData as any).grade),
        }
    });

    const { isSubmitting } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            // Convert "ALL_GRADES" to null for database
            const submitValues = {
                ...values,
                grade: values.grade && values.grade !== "ALL_GRADES" ? values.grade : null,
            };
            await axios.patch(`/api/courses/${courseId}`, submitValues);
            toast.success(t("teacher.courseEdit.forms.updateSuccess"));
            toggleEdit();
            router.refresh();
        } catch {
            toast.error(t("teacher.courseEdit.forms.updateError"));
        }
    }

    const getGradeLabel = (grade: string | null | undefined) => {
        if (!grade || !grade.trim()) return t("auth.grades.allGrades");
        const normalized = grade.trim().toUpperCase();
        switch (normalized) {
            case "FIRST_SECONDARY":
                return t("auth.grades.firstSecondary");
            case "SECOND_SECONDARY":
                return t("auth.grades.secondSecondary");
            case "THIRD_SECONDARY":
                return t("auth.grades.thirdSecondary");
            default:
                // For old/invalid values, show as "All Grades"
                return t("auth.grades.allGrades");
        }
    };

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                {t("auth.grade")}
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing && (<>{t("common.cancel")}</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t("teacher.courseEdit.forms.editGrade")}
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                <p className={cn(
                    "text-sm mt-2 text-muted-foreground",
                    !(initialData as any).grade && "text-muted-foreground italic"
                )}>
                    {getGradeLabel((initialData as any).grade)}
                </p>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField 
                            control={form.control}
                            name="grade"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("auth.grade")}</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isSubmitting}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("auth.selectGrade")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ALL_GRADES">{t("auth.grades.allGrades")}</SelectItem>
                                            <SelectItem value="FIRST_SECONDARY">{t("auth.grades.firstSecondary")}</SelectItem>
                                            <SelectItem value="SECOND_SECONDARY">{t("auth.grades.secondSecondary")}</SelectItem>
                                            <SelectItem value="THIRD_SECONDARY">{t("auth.grades.thirdSecondary")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button disabled={isSubmitting} type="submit">
                                {t("common.save")}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
}

