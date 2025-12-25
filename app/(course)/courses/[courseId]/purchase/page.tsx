"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { ArrowLeft, CreditCard, Wallet, AlertCircle, Ticket, Check } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/contexts/language-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
}

export default function PurchasePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { courseId } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [codeRedeemed, setCodeRedeemed] = useState(false);
  const [redeemError, setRedeemError] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    fetchCourse();
    fetchUserBalance();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
      } else {
        toast.error("حدث خطأ أثناء تحميل الكورس");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("حدث خطأ أثناء تحميل الكورس");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch("/api/user/balance");
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!code.trim()) {
      setRedeemError({
        type: "codeRequired",
        message: t("course.redeem.errors.codeRequired"),
      });
      toast.error(t("course.redeem.errors.codeRequired"));
      return;
    }

    setIsRedeeming(true);
    setRedeemError(null);
    
    try {
      const response = await fetch("/api/codes/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t("course.redeem.success"));
        setCodeRedeemed(true);
        setRedeemError(null);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const errorText = await response.text();
          errorData = { error: "unknown", message: errorText };
        }
        const errorType = errorData.error || "unknown";
        
        let errorMessage = "";
        let errorDescription = "";
        
        switch (errorType) {
          case "codeRequired":
            errorMessage = t("course.redeem.errors.codeRequired");
            errorDescription = t("course.redeem.errors.codeRequiredDesc");
            break;
          case "invalidCode":
            errorMessage = t("course.redeem.errors.invalidCode");
            errorDescription = t("course.redeem.errors.invalidCodeDesc");
            break;
          case "codeAlreadyUsed":
            errorMessage = t("course.redeem.errors.codeAlreadyUsed");
            errorDescription = t("course.redeem.errors.codeAlreadyUsedDesc");
            break;
          case "alreadyPurchased":
            errorMessage = t("course.redeem.errors.alreadyPurchased");
            errorDescription = t("course.redeem.errors.alreadyPurchasedDesc");
            break;
          case "unauthorized":
            errorMessage = t("course.redeem.errors.unauthorized");
            errorDescription = t("course.redeem.errors.unauthorizedDesc");
            break;
          case "serverError":
            errorMessage = t("course.redeem.errors.serverError");
            errorDescription = t("course.redeem.errors.serverErrorDesc");
            break;
          default:
            errorMessage = errorData.message || t("course.redeem.errors.serverError");
            errorDescription = t("course.redeem.errors.serverErrorDesc");
        }
        
        setRedeemError({ type: errorType, message: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error redeeming code:", error);
      const errorMessage = t("course.redeem.errors.networkError");
      const errorDescription = t("course.redeem.errors.networkErrorDesc");
      setRedeemError({ type: "networkError", message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handlePurchase = async () => {
    if (!course) return;

    setIsPurchasing(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/purchase`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("تم شراء الكورس بنجاح!");
        router.push("/dashboard");
      } else {
        const error = await response.text();
        if (error.includes("Insufficient balance")) {
          toast.error("رصيد غير كافي. يرجى إضافة رصيد إلى حسابك");
        } else if (error.includes("already purchased")) {
          toast.error("لقد قمت بشراء هذه الكورس مسبقاً");
        } else {
          toast.error(error || "حدث خطأ أثناء الشراء");
        }
      }
    } catch (error) {
      console.error("Error purchasing course:", error);
      toast.error("حدث خطأ أثناء الشراء");
    } finally {
      setIsPurchasing(false);
    }
  };

  const hasSufficientBalance = course && userBalance >= (course.price || 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">الكورس غير موجودة</h1>
          <Button asChild>
            <Link href="/dashboard">العودة إلى لوحة التحكم</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              رجوع
            </Button>
            <h1 className="text-2xl font-bold">شراء الكورس</h1>
          </div>

          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>{course.title}</CardTitle>
              <CardDescription>
                {course.description || "لا يوجد وصف للكورس"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {course.imageUrl && (
                <div className="mb-4">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="text-2xl font-bold text-brand">
                {course.price?.toFixed(2) || "0.00"} جنيه
              </div>
            </CardContent>
          </Card>

          {/* Balance Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                رصيد الحساب
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand"></div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xl font-bold">
                    {userBalance.toFixed(2)} جنيه
                  </div>
                  {!hasSufficientBalance && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>رصيد غير كافي لشراء هذه الكورس</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Code Redemption */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                {t("course.redeem.title")}
              </CardTitle>
              <CardDescription>
                {t("course.redeem.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="code" className="sr-only">
                    {t("course.redeem.title")}
                  </Label>
                  <Input
                    id="code"
                    placeholder={t("course.redeem.placeholder")}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setRedeemError(null);
                    }}
                    disabled={isRedeeming || codeRedeemed}
                    className="text-center font-mono"
                  />
                </div>
                <Button
                  onClick={handleRedeemCode}
                  disabled={isRedeeming || !code.trim() || codeRedeemed}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isRedeeming ? (
                    t("course.redeem.redeeming")
                  ) : codeRedeemed ? (
                    <>
                      <Check className="h-4 w-4 ml-2" />
                      {t("course.redeem.redeemed")}
                    </>
                  ) : (
                    t("course.redeem.button")
                  )}
                </Button>
              </div>
              
              {/* Error Message */}
              {redeemError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{redeemError.message}</AlertTitle>
                  <AlertDescription>
                    {redeemError.type === "codeRequired" && t("course.redeem.errors.codeRequiredDesc")}
                    {redeemError.type === "invalidCode" && t("course.redeem.errors.invalidCodeDesc")}
                    {redeemError.type === "codeAlreadyUsed" && t("course.redeem.errors.codeAlreadyUsedDesc")}
                    {redeemError.type === "alreadyPurchased" && t("course.redeem.errors.alreadyPurchasedDesc")}
                    {redeemError.type === "unauthorized" && t("course.redeem.errors.unauthorizedDesc")}
                    {redeemError.type === "serverError" && t("course.redeem.errors.serverErrorDesc")}
                    {redeemError.type === "networkError" && t("course.redeem.errors.networkErrorDesc")}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">أو</span>
            </div>
          </div>

          {/* Purchase Actions */}
          <div className="space-y-4">
            {!hasSufficientBalance && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-amber-700 mb-4">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">رصيد غير كافي</span>
                  </div>
                  <p className="text-amber-700 mb-4">
                    تحتاج إلى {(course.price || 0) - userBalance} جنيه إضافية لشراء هذه الكورس
                  </p>
                  <Button asChild className="bg-brand hover:bg-brand/90">
                    <Link href="/dashboard/balance">إضافة رصيد</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handlePurchase}
              disabled={isPurchasing || !hasSufficientBalance || codeRedeemed}
              className="w-full bg-brand hover:bg-brand/90 text-white"
              size="lg"
            >
              {isPurchasing ? (
                "جاري الشراء..."
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  شراء الكورس
                </div>
              )}
            </Button>

            {!codeRedeemed && (
              <div className="text-center text-sm text-muted-foreground">
                <p>سيتم خصم {course.price?.toFixed(2) || "0.00"} جنيه من رصيدك</p>
                <p>ستتمكن من الوصول إلى الكورس فوراً بعد الشراء</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 