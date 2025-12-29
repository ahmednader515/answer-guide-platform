"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowLeft, Eye, Download, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

interface QuizResult {
    id: string;
    studentId: string;
    quizId: string;
    score: number;
    totalPoints: number;
    submittedAt: string;
    user: {
        fullName: string;
        phoneNumber: string;
    };
    quiz: {
        title: string;
        course: {
            id: string;
            title: string;
        };
    };
    answers: QuizAnswer[];
}

interface QuizAnswer {
    id: string;
    questionId: string;
    answer: string;
    isCorrect: boolean;
    points: number;
    question: {
        text: string;
        type: string;
        points: number;
    };
}

const QuizResultsContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quizId = searchParams.get('quizId');
    
    const [results, setResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [quizDetails, setQuizDetails] = useState<any>(null);
    const [filteredResults, setFilteredResults] = useState<QuizResult[]>([]);

    useEffect(() => {
        if (quizId) {
            fetchQuizDetails();
        } else {
            toast.error("لم يتم تحديد الاختبار");
            router.push("/dashboard/teacher/quizzes");
        }
    }, [quizId]);

    // Initial load when quizId is available
    useEffect(() => {
        if (quizId) {
            fetchQuizResults();
        }
    }, [quizId]);

    // Handler for search submit
    const handleSearch = () => {
        if (quizId) {
            fetchQuizResults();
        }
    };

    // Handler to clear search
    const handleClearSearch = () => {
        setSearchTerm("");
        if (quizId) {
            fetchQuizResults();
        }
    };

    const fetchQuizResults = async () => {
        try {
            setLoading(true);
            const isSearching = searchTerm.trim().length > 0;
            // When searching, load all results (no pagination). When not searching, use pagination.
            const skip = 0;
            const take = isSearching ? 10000 : 25; // Large limit for search to get all results
            const searchParam = searchTerm.trim() ? `&search=${encodeURIComponent(searchTerm.trim())}` : "";
            const response = await fetch(`/api/teacher/quiz-results?quizId=${quizId}&skip=${skip}&take=${take}${searchParam}`);
            if (response.ok) {
                const data = await response.json();
                // Handle both old format (array) and new format (object with quizResults)
                const fetchedResults = Array.isArray(data) ? data : (data.quizResults || []);
                setResults(fetchedResults);
                setFilteredResults(fetchedResults);
            } else {
                toast.error("حدث خطأ أثناء تحميل النتائج");
            }
        } catch (error) {
            console.error("Error fetching quiz results:", error);
            toast.error("حدث خطأ أثناء تحميل النتائج");
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizDetails = async () => {
        try {
            const response = await fetch(`/api/teacher/quizzes/${quizId}`);
            if (response.ok) {
                const data = await response.json();
                setQuizDetails(data);
            }
        } catch (error) {
            console.error("Error fetching quiz details:", error);
        }
    };

    const handleViewDetails = (result: QuizResult) => {
        router.push(`/dashboard/teacher/quiz-results/${result.id}`);
    };

    const calculatePercentage = (score: number, totalPoints: number) => {
        return totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    };

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600";
        if (percentage >= 80) return "text-blue-600";
        if (percentage >= 70) return "text-yellow-600";
        if (percentage >= 60) return "text-orange-600";
        return "text-red-600";
    };

    const getGradeBadge = (percentage: number) => {
        if (percentage >= 90) return { variant: "default" as const, text: "ممتاز" };
        if (percentage >= 80) return { variant: "default" as const, text: "جيد جداً" };
        if (percentage >= 70) return { variant: "secondary" as const, text: "جيد" };
        if (percentage >= 60) return { variant: "outline" as const, text: "مقبول" };
        return { variant: "destructive" as const, text: "ضعيف" };
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        );
    }

    if (!quizId) {
        return (
            <div className="p-6">
                <div className="text-center">لم يتم تحديد الاختبار</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/teacher/quizzes")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        العودة
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        نتائج الاختبار: {quizDetails?.title || "جاري التحميل..."}
                    </h1>
                </div>
            </div>

            {quizDetails && (
                <Card>
                    <CardHeader>
                        <CardTitle>معلومات الاختبار</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <h4 className="font-medium mb-1">عنوان الاختبار</h4>
                                <p className="text-sm text-muted-foreground">{quizDetails.title}</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-1">الكورس</h4>
                                <p className="text-sm text-muted-foreground">{quizDetails.course?.title}</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-1">عدد الأسئلة</h4>
                                <Badge variant="secondary">
                                    {quizDetails.questions?.length || 0} سؤال
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي النتائج</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{results.length}</div>
                        <p className="text-xs text-muted-foreground">نتيجة</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">متوسط الدرجات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {results.length > 0 
                                ? Math.round(results.reduce((sum, r) => sum + calculatePercentage(r.score, r.totalPoints), 0) / results.length)
                                : 0
                            }%
                        </div>
                        <p className="text-xs text-muted-foreground">متوسط</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">أعلى درجة</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {results.length > 0 
                                ? Math.max(...results.map(r => calculatePercentage(r.score, r.totalPoints)))
                                : 0
                            }%
                        </div>
                        <p className="text-xs text-muted-foreground">أفضل نتيجة</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">أدنى درجة</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {results.length > 0 
                                ? Math.min(...results.map(r => calculatePercentage(r.score, r.totalPoints)))
                                : 0
                            }%
                        </div>
                        <p className="text-xs text-muted-foreground">أسوأ نتيجة</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>نتائج الطلاب</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث في الطلاب..."
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
                                <TableHead className="rtl:text-right ltr:text-left">الطالب</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">الدرجة</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">النسبة المئوية</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">التقييم</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">تاريخ التقديم</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">الإجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredResults.map((result) => {
                                const percentage = calculatePercentage(result.score, result.totalPoints);
                                const grade = getGradeBadge(percentage);
                                
                                return (
                                    <TableRow key={result.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                <div>{result.user.fullName}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {result.user.phoneNumber}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {result.score} / {result.totalPoints}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className={`font-medium ${getGradeColor(percentage)}`}>
                                                {percentage}%
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={grade.variant}>
                                                {grade.text}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-muted-foreground">
                                                {new Date(result.submittedAt).toLocaleDateString("ar-EG")}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(result.submittedAt).toLocaleTimeString("ar-EG")}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleViewDetails(result)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                تفاصيل
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    
                    {filteredResults.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">لا توجد نتائج للعرض</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const QuizResultsPage = () => {
    return (
        <Suspense fallback={
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        }>
            <QuizResultsContent />
        </Suspense>
    );
};

export default QuizResultsPage; 