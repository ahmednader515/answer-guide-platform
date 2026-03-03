"use client";

import { SearchInput } from "./search-input";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Users, Timer, TimerOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Course, Purchase } from "@prisma/client";
import { useLanguage } from "@/lib/contexts/language-context";

type CourseWithDetails = Course & {
    chapters: { id: string }[];
    purchases: Purchase[];
    progress: number;
}

interface SearchContentProps {
    title: string;
    coursesWithProgress: CourseWithDetails[];
}

const getAccessCountdown = (course: CourseWithDetails) => {
    if (!course.purchases.length) return null;
    const days = course.accessDurationDays ?? 7;
    if (days === 0) return null; // unlimited
    const purchase = course.purchases[0];
    const expiresAt = new Date(
        new Date(purchase.createdAt).getTime() + days * 24 * 60 * 60 * 1000
    );
    return Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

export const SearchContent = ({ title, coursesWithProgress }: SearchContentProps) => {
    const { t } = useLanguage();

    return (
        <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{t("search.title")}</h1>
                <p className="text-muted-foreground text-lg">
                    {title 
                        ? t("search.searchResults", { query: title })
                        : t("search.subtitle")
                    }
                </p>
            </div>

            {/* Search Input Section */}
            <div className="bg-card rounded-2xl p-6 border shadow-sm">
                <div className="max-w-2xl mx-auto">
                    <SearchInput />
                </div>
            </div>

            {/* Results Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">
                        {title 
                            ? t("search.searchResultsCount", { count: coursesWithProgress.length.toString() })
                            : t("search.allCourses", { count: coursesWithProgress.length.toString() })
                        }
                    </h2>
                    {coursesWithProgress.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                            {t("search.coursesAvailable", { count: coursesWithProgress.length.toString() })}
                        </div>
                    )}
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {coursesWithProgress.map((course) => {
                        const daysRemaining = getAccessCountdown(course);
                        const isExpired = daysRemaining !== null && daysRemaining <= 0;
                        const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 3;

                        return (
                        <div
                            key={course.id}
                            className="group bg-card rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="relative w-full aspect-[16/9]">
                                <Image
                                    src={course.imageUrl || "/placeholder.png"}
                                    alt={course.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                
                                {/* Course Status Badge */}
                                <div className="absolute top-4 right-4">
                                    <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                                        course.purchases.length > 0 
                                            ? "bg-green-500 text-white" 
                                            : "bg-white/90 backdrop-blur-sm text-gray-800"
                                    }`}>
                                        {course.purchases.length > 0 ? t("search.subscribed") : t("search.available")}
                                    </div>
                                </div>

                                {/* Price Badge */}
                                <div className="absolute top-4 left-4">
                                    <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                                        course.price === 0 
                                            ? "bg-green-500 text-white" 
                                            : "bg-white/90 backdrop-blur-sm text-gray-800"
                                    }`}>
                                        {course.price === 0 ? t("search.free") : `${course.price} ${t("dashboard.egp")}`}
                                    </div>
                                </div>

                                {/* Access expiry badge */}
                                {daysRemaining !== null && (
                                    <div className={`absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
                                        isExpired
                                            ? "bg-red-600/90 text-white"
                                            : isExpiringSoon
                                            ? "bg-orange-500/90 text-white"
                                            : "bg-black/60 text-white"
                                    }`}>
                                        {isExpired ? <TimerOff className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
                                        <span>
                                            {isExpired
                                                ? t("dashboard.accessExpired")
                                                : t("dashboard.accessExpiresIn", { days: daysRemaining.toString() })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="p-6">
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold mb-3 line-clamp-2 min-h-[3rem] text-gray-900">
                                        {course.title}
                                    </h3>
                                    
                                    {/* Course Stats */}
                                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center gap-1">
                                            <BookOpen className="h-4 w-4" />
                                            <span className="whitespace-nowrap">
                                                {course.chapters.length} {course.chapters.length === 1 ? t("homepage.chapter") : t("homepage.chapters")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            <span className="whitespace-nowrap">
                                                {course.purchases.length} {course.purchases.length === 1 ? t("search.student") : t("search.students")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span className="whitespace-nowrap">{new Date(course.updatedAt).toLocaleDateString('en', {
                                                year: 'numeric',
                                                month: 'short'
                                            })}</span>
                                        </div>
                                    </div>

                                    {/* Expiry warning bar */}
                                    {daysRemaining !== null && (
                                        <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 mb-2 ${
                                            isExpired
                                                ? "bg-red-50 text-red-700 border border-red-200"
                                                : isExpiringSoon
                                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                                : "bg-blue-50 text-blue-700 border border-blue-200"
                                        }`}>
                                            {isExpired
                                                ? <TimerOff className="h-4 w-4 flex-shrink-0" />
                                                : <Timer className="h-4 w-4 flex-shrink-0" />}
                                            <span className="font-medium">
                                                {isExpired
                                                    ? t("dashboard.accessExpired")
                                                    : t("dashboard.accessExpiresIn", { days: daysRemaining.toString() })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <Button 
                                    className="w-full bg-brand hover:bg-brand/90 text-white font-semibold py-3 text-base transition-all duration-200 hover:scale-105" 
                                    variant="default"
                                    asChild
                                >
                                    <Link href={course.chapters.length > 0 ? `/courses/${course.id}/chapters/${course.chapters[0].id}` : `/courses/${course.id}`}>
                                        {course.purchases.length > 0 ? t("search.continueLearning") : t("search.viewCourse")}
                                    </Link>
                                </Button>

                                {course.purchases.length === 0 && (
                                    <Button
                                        className="w-full mt-3 border-brand text-brand hover:bg-brand/10 font-semibold py-3 text-base transition-all duration-200"
                                        variant="outline"
                                        asChild
                                    >
                                        <Link href={`/courses/${course.id}/purchase`}>
                                            {t("search.purchaseCourse")}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {coursesWithProgress.length === 0 && (
                    <div className="text-center py-16">
                        <div className="bg-muted/50 rounded-2xl p-8 max-w-md mx-auto">
                            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {title ? t("search.noCoursesFound") : t("search.noCoursesAvailable")}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {title 
                                    ? t("search.tryDifferentSearch")
                                    : t("search.coursesComingSoon")
                                }
                            </p>
                            {title && (
                                <Button asChild className="bg-brand hover:bg-brand/90 text-white font-semibold">
                                    <Link href="/dashboard/search">
                                        {t("search.viewAllCourses")}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

