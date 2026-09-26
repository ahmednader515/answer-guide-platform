"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/contexts/language-context";

const GRADE_OPTIONS = [
    { value: "الأول الثانوي", labelKey: "auth.grades.firstSecondary" },
    { value: "الثاني الثانوي", labelKey: "auth.grades.secondSecondary" },
    { value: "الثالث الثانوي", labelKey: "auth.grades.thirdSecondary" },
] as const;

export default function ProfilePage() {
    const { t } = useLanguage();
    const { update } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullName, setFullName] = useState("");
    const [grade, setGrade] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [parentPhoneNumber, setParentPhoneNumber] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await fetch("/api/user/profile");
                if (!response.ok) {
                    toast.error(t("profile.loadError"));
                    return;
                }
                const data = await response.json();
                setFullName(data.fullName || "");
                setGrade(data.grade || "");
                setPhoneNumber(data.phoneNumber || "");
                setParentPhoneNumber(data.parentPhoneNumber || "");
            } catch (error) {
                console.error("Error loading profile:", error);
                toast.error(t("profile.loadError"));
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [t]);

    const handleSave = async () => {
        if (!fullName.trim() || !grade) return;

        setSaving(true);
        try {
            const response = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName: fullName.trim(), grade }),
            });

            if (!response.ok) {
                toast.error(t("profile.updateError"));
                return;
            }

            const data = await response.json();
            setFullName(data.fullName || "");
            setGrade(data.grade || "");
            await update({ name: data.fullName });
            toast.success(t("profile.updateSuccess"));
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(t("profile.updateError"));
        } finally {
            setSaving(false);
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
        <div className="p-6">
            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>{t("profile.title")}</CardTitle>
                    <CardDescription>{t("profile.subtitle")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">{t("profile.fullName")}</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("profile.grade")}</Label>
                        <Select value={grade} onValueChange={setGrade}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("auth.selectGrade")} />
                            </SelectTrigger>
                            <SelectContent>
                                {GRADE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {t(option.labelKey)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">{t("profile.phoneNumber")}</Label>
                        <Input id="phoneNumber" value={phoneNumber} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="parentPhoneNumber">{t("profile.parentPhoneNumber")}</Label>
                        <Input id="parentPhoneNumber" value={parentPhoneNumber} disabled />
                    </div>
                    <Button
                        className="bg-brand hover:bg-brand/90 text-white"
                        onClick={handleSave}
                        disabled={saving || !fullName.trim() || !grade}
                    >
                        {saving ? t("common.loading") : t("profile.save")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
