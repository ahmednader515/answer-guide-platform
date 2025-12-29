"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Search, Eye, Award, TrendingUp, Users, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
    id: string;
    title: string;
}

interface Quiz {
    id: string;
    title: string;
    courseId: string;
    course: {
        title: string;
    };
    totalPoints: number;
}

interface QuizResult {
    id: string;
    studentId: string;
    user: {
        fullName: string;
        phoneNumber: string;
    };
    quizId: string;
    quiz: {
        title: string;
        course: {
            id: string;
            title: string;
        };
        totalPoints: number;
    };
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    answers: QuizAnswer[];
}

interface QuizAnswer {
    questionId: string;
    question: {
        text: string;
        type: string;
        points: number;
    };
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
}

const GradesPage = () => {
    const { t } = useLanguage();
    const [courses, setCourses] = useState<Course[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [selectedQuiz, setSelectedQuiz] = useState<string>("");
    const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchCourses();
        fetchQuizzes();
    }, []);

    // Initial load (without search)
    useEffect(() => {
        fetchQuizResults(true);
    }, []);

    // Handler for search submit
    const handleSearch = () => {
        fetchQuizResults(true);
    };

    // Handler to clear search
    const handleClearSearch = () => {
        setSearchTerm("");
        fetchQuizResults(true);
    };

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchQuizzes = async () => {
        try {
            const response = await fetch("/api/teacher/quizzes");
            if (response.ok) {
                const data = await response.json();
                setQuizzes(data);
            }
        } catch (error) {
            console.error("Error fetching quizzes:", error);
        }
    };

    const fetchQuizResults = async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            
            const isSearching = searchTerm.trim().length > 0;
            // When searching, load all results (no pagination). When not searching, use pagination.
            const skip = isSearching ? 0 : (reset ? 0 : quizResults.length);
            const take = isSearching ? 10000 : 25; // Large limit for search to get all results
            const searchParam = searchTerm.trim() ? `&search=${encodeURIComponent(searchTerm.trim())}` : "";
            
            const response = await fetch(`/api/teacher/quiz-results?skip=${skip}&take=${take}${searchParam}`);
            if (response.ok) {
                const data = await response.json();
                if (reset || isSearching) {
                    // When resetting or searching, replace all results
                    setQuizResults(data.quizResults || []);
                } else {
                    // When loading more (not searching), append results
                    setQuizResults(prev => [...prev, ...(data.quizResults || [])]);
                }
                // When searching, there's no "more" to load. When not searching, check hasMore.
                setHasMore(isSearching ? false : (data.hasMore || false));
            }
        } catch (error) {
            console.error("Error fetching quiz results:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        fetchQuizResults(false);
    };

    const handleViewResult = (result: QuizResult) => {
        setSelectedResult(result);
        setIsDialogOpen(true);
    };

    // Server handles search, only filter by course and quiz client-side
    const filteredResults = quizResults.filter(result => {
        const matchesCourse = !selectedCourse || selectedCourse === "all" || result.quiz.course.id === selectedCourse;
        const matchesQuiz = !selectedQuiz || selectedQuiz === "all" || result.quizId === selectedQuiz;
        
        return matchesCourse && matchesQuiz;
    });

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600";
        if (percentage >= 80) return "text-green-500";
        if (percentage >= 70) return "text-green-400";
        if (percentage >= 60) return "text-orange-600";
        return "text-red-600";
    };

    const getGradeBadge = (percentage: number) => {
        if (percentage >= 90) return { variant: "default" as const, className: "bg-green-600 text-white" };
        if (percentage >= 80) return { variant: "default" as const, className: "bg-green-500 text-white" };
        if (percentage >= 70) return { variant: "default" as const, className: "bg-green-400 text-white" };
        if (percentage >= 60) return { variant: "default" as const, className: "bg-orange-600 text-white" };
        return { variant: "destructive" as const, className: "" };
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t("teacher.grades.loading")}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t("teacher.grades.title")}
                </h1>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("teacher.grades.summary.totalStudents")}</p>
                                <p className="text-2xl font-bold">
                                    {new Set(quizResults.map(r => r.studentId)).size}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Award className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("teacher.grades.summary.averageScore")}</p>
                                <p className="text-2xl font-bold">
                                    {quizResults.length > 0 
                                        ? Math.round(quizResults.reduce((sum, r) => sum + r.percentage, 0) / quizResults.length)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-8 w-8 text-purple-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("teacher.grades.summary.highestScore")}</p>
                                <p className="text-2xl font-bold">
                                    {quizResults.length > 0 
                                        ? Math.max(...quizResults.map(r => r.percentage))
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <FileText className="h-8 w-8 text-orange-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("teacher.grades.summary.totalQuizzes")}</p>
                                <p className="text-2xl font-bold">{quizResults.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("teacher.grades.filters.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("teacher.grades.filters.search")}</label>
                            <div className="flex items-center space-x-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("teacher.grades.filters.searchPlaceholder")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleSearch();
                                        }
                                    }}
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
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("teacher.grades.filters.course")}</label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("teacher.grades.filters.allCourses")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("teacher.grades.filters.allCourses")}</SelectItem>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("teacher.grades.filters.quiz")}</label>
                            <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("teacher.grades.filters.allQuizzes")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("teacher.grades.filters.allQuizzes")}</SelectItem>
                                    {quizzes.map((quiz) => (
                                        <SelectItem key={quiz.id} value={quiz.id}>
                                            {quiz.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("teacher.grades.table.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.student")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.quiz")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.course")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.score")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.percentage")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.submittedAt")}</TableHead>
                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredResults.map((result) => {
                                const gradeBadge = getGradeBadge(result.percentage);
                                return (
                                    <TableRow key={result.id}>
                                        <TableCell className="font-medium">
                                            {result.user.fullName}
                                        </TableCell>
                                        <TableCell>
                                            {result.quiz.title}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {result.quiz.course.title}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-bold">
                                                {result.score}/{result.totalPoints}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge {...gradeBadge}>
                                                {result.percentage}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(result.submittedAt), "dd/MM/yyyy", { locale: ar })}
                                        </TableCell>
                                        <TableCell>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleViewResult(result)}
                                            >
                                                <Eye className="h-4 w-4" />
                                                {t("teacher.grades.table.viewDetails")}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {hasMore && !searchTerm && !selectedCourse && !selectedQuiz && (
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

            {/* Result Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t("teacher.grades.details.title", { name: selectedResult?.user.fullName || "" })}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedResult && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("teacher.grades.details.summary.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {selectedResult.score}/{selectedResult.totalPoints}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("teacher.grades.details.summary.score")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-2xl font-bold ${getGradeColor(selectedResult.percentage)}`}>
                                                {selectedResult.percentage}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("teacher.grades.details.summary.percentage")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {selectedResult.answers.filter(a => a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("teacher.grades.details.summary.correctAnswers")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">
                                                {selectedResult.answers.filter(a => !a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("teacher.grades.details.summary.wrongAnswers")}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">{t("teacher.grades.details.summary.overallProgress")}</span>
                                            <span className="text-sm font-medium">{selectedResult.percentage}%</span>
                                        </div>
                                        <Progress value={selectedResult.percentage} className="w-full" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detailed Answers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("teacher.grades.details.answers.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {selectedResult.answers.map((answer, index) => (
                                            <div key={answer.questionId} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium">{t("teacher.grades.details.answers.questionNumber", { number: index + 1 })}</h4>
                                                    <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                                                        {answer.isCorrect ? t("teacher.grades.details.answers.correct") : t("teacher.grades.details.answers.wrong")}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-2">{answer.question.text}</p>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium">{t("teacher.grades.details.answers.studentAnswer")}</span>
                                                        <p className="text-muted-foreground">{answer.studentAnswer}</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">{t("teacher.grades.details.answers.correctAnswer")}</span>
                                                        <p className="text-green-600">{answer.correctAnswer}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-sm">
                                                    <span className="font-medium">{t("teacher.grades.details.answers.points")}</span>
                                                    <span className="text-muted-foreground">
                                                        {" "}{answer.pointsEarned}/{answer.question.points}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GradesPage; 