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
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Clock } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/contexts/language-context";

interface AccessDurationFormProps {
    initialData: {
        accessDurationDays: number;
    };
    courseId: string;
}

const formSchema = z.object({
    accessDurationDays: z.coerce
        .number()
        .int()
        .min(0, { message: "يجب أن تكون المدة 0 أو أكثر (0 = بدون انتهاء)" }),
});

export const AccessDurationForm = ({
    initialData,
    courseId,
}: AccessDurationFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            accessDurationDays: initialData.accessDurationDays ?? 7,
        },
    });

    const { isSubmitting, isValid } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success(t("teacher.courseEdit.forms.updateSuccess"));
            setIsEditing(false);
            router.refresh();
        } catch {
            toast.error(t("teacher.courseEdit.forms.updateError"));
        }
    };

    const displayValue = initialData.accessDurationDays === 0
        ? t("teacher.courseEdit.forms.accessDurationUnlimited")
        : t("teacher.courseEdit.forms.accessDurationDays", { days: initialData.accessDurationDays });

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("teacher.courseEdit.forms.accessDuration")}
                </div>
                <Button onClick={() => setIsEditing((v) => !v)} variant="ghost">
                    {isEditing ? (
                        t("common.cancel")
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t("teacher.courseEdit.forms.editAccessDuration")}
                        </>
                    )}
                </Button>
            </div>

            {!isEditing && (
                <p className="text-sm mt-2 text-muted-foreground">
                    {displayValue}
                </p>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="accessDurationDays"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={1}
                                            disabled={isSubmitting}
                                            placeholder="7"
                                            {...field}
                                            onChange={(e) =>
                                                field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))
                                            }
                                        />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                        {t("teacher.courseEdit.forms.accessDurationHint")}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button disabled={!isValid || isSubmitting} type="submit">
                                {t("common.save")}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
};
