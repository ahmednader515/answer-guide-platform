"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Users, BookOpen, Award, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { ScrollProgress } from "@/components/scroll-progress";
import { useEffect, useState } from "react";
import { db } from "@/lib/db"; // Import db client
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";

// Define types based on Prisma schema
type Course = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Purchase = {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  purchases: Purchase[];
  progress: number;
};

// Helper function to validate image URL
function getValidImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl || imageUrl.trim() === "") {
    return "/placeholder.png";
  }
  
  // Check if it's a valid absolute URL
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    try {
      new URL(imageUrl);
      return imageUrl;
    } catch {
      return "/placeholder.png";
    }
  }
  
  // Check if it's a valid relative path
  if (imageUrl.startsWith("/")) {
    return imageUrl;
  }
  
  // Invalid format, use placeholder
  return "/placeholder.png";
}

export default function HomePage() {
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        // Fetch courses from public API endpoint
        const response = await fetch("/api/courses/public");
        
        if (!response.ok) {
          console.error("Failed to fetch courses:", response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        console.log("Fetched courses:", data); // Debug log
        setCourses(data);

      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollIndicator(entry.isIntersecting);
      },
      {
        threshold: 0.5, // Trigger when 50% of the hero section is visible
      }
    );

    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      observer.observe(heroSection);
    }

    return () => {
      if (heroSection) {
        observer.unobserve(heroSection);
      }
    };
  }, []);

  const scrollToCourses = () => {
    const coursesSection = document.getElementById('courses-section');
    if (coursesSection) {
      const offset = coursesSection.offsetTop - 80; // Adjust for navbar height
      window.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  };

  return (
      <div className="h-full w-full bg-background">
        <Navbar />
        <ScrollProgress />
      {/* Hero Section */}
      <section id="hero-section" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 md:pt-0 bg-gradient-to-t from-brand/25 via-brand/10 to-transparent">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 items-center">
          {/* Image Section - First on mobile */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative flex justify-center items-center order-1 md:order-2"
          >
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              <Image
                src="/teacher-image.png"
                alt={t("homepage.teacherName")}
                fill
                priority
                className="object-cover border-4 border-brand/20 shadow-lg"
                sizes="(max-width: 768px) 256px, 320px"
              />
            </div>
            
            {/* Floating Stationery Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -15, 0],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.5,
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="absolute top-1 -right-2"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Image
                src="/stack-of-books.png"
                alt="Books"
                width={50}
                height={50}
                className="object-contain"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -12, 0],
                rotate: [0, -5, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.7,
                y: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="absolute bottom-1/3 left-6"
              whileHover={{ scale: 1.1, rotate: -5 }}
            >
              <Image
                src="/pen.png"
                alt="Pen"
                width={40}
                height={40}
                className="object-contain"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: [0, -18, 0],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 0.5, 
                delay: 0.9,
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                rotate: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="absolute top-1/2 -right-6"
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <Image
                src="/certificate.png"
                alt="Certificate"
                width={55}
                height={55}
                className="object-contain"
              />
            </motion.div>
          </motion.div>

          {/* Text Section - Second on mobile */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mt-0 md:mt-0 order-2 md:order-1"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {t("homepage.teacherName")}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              {t("homepage.successStartsHere")}
            </p>
            <Button size="lg" asChild className="bg-brand hover:bg-brand/90 text-white">
              <Link href="/sign-up">
                {t("homepage.startNow")} <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        {showScrollIndicator && (
          <motion.div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex-col items-center gap-2 cursor-pointer hidden md:flex"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 1, duration: 0.5 }}
            onClick={scrollToCourses}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <ChevronDown className="h-8 w-8 text-muted-foreground" />
            </motion.div>
          </motion.div>
        )}
      </section>

      {/* Courses Section */}
      <section id="courses-section" className="py-20 bg-muted/50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t("homepage.availableCourses")}</h2>
            <p className="text-muted-foreground">{t("homepage.discoverCourses")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-6"
          >
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="w-full sm:w-80 md:w-72 lg:w-80 bg-card rounded-xl overflow-hidden border shadow-sm animate-pulse"
                >
                  <div className="w-full aspect-video bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : (
              courses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t("homepage.noCoursesAvailable")}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t("homepage.coursesComingSoon")}
                    </p>
                    <Button 
                      variant="outline" 
                      asChild
                      className="bg-brand hover:bg-brand/90 text-white border-brand"
                    >
                      <Link href="/sign-up">
                        {t("homepage.signUpForEarlyAccess")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                courses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group w-full sm:w-80 md:w-72 lg:w-80 bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="relative w-full aspect-video">
                      <Image
                        src={getValidImageUrl(course.imageUrl)}
                        alt={course.title}
                        fill
                        className="object-cover rounded-t-xl"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <BookOpen className="h-4 w-4" />
                        <span>
                          {course.chapters?.length || 0} {course.chapters?.length === 1 ? t("homepage.chapter") : t("homepage.chapters")}
                          {course.quizzes && course.quizzes.length > 0 && (
                            <span className="mr-2">، {course.quizzes.length} {course.quizzes.length === 1 ? t("homepage.quiz") : t("homepage.quizzes")}</span>
                          )}
                        </span>
                      </div>
                      <Button 
                        className="w-full bg-brand hover:bg-brand/90 text-white" 
                        variant="default"
                        onClick={() => {
                          if (!session?.user) {
                            router.push("/sign-in");
                            return;
                          }
                          const courseUrl = course.chapters && course.chapters.length > 0 
                            ? `/courses/${course.id}/chapters/${course.chapters[0].id}` 
                            : `/courses/${course.id}`;
                          router.push(courseUrl);
                        }}
                      >
                        {t("homepage.viewCourse")}
                      </Button>
                    </div>
                  </motion.div>
                ))
              )
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("homepage.testimonials")}</h2>
            <p className="text-muted-foreground">{t("homepage.testimonialsSubtitle")}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "عصام اسامة",
                grade: "الصف الأول الثانوي",
                testimonial: "تجربة رائعة مع الأستاذ محمد الهتيمي، شرح مميز وطريقة سهلة في توصيل المعلومة"
              },
              {
                name: "سيف طارق",
                grade: "الصف الثاني الثانوي",
                testimonial: "المنهج منظم جداً والشرح واضح، ساعدني في فهم المواد بشكل أفضل"
              },
              {
                name: "عمر جمال",
                grade: "الصف الأول الثانوي",
                testimonial: "أفضل منصة تعليمية استخدمتها، المحتوى غني والشرح مبسط"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-lg p-6 shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden">
                    <Image
                      src="/male.png"
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="mr-4">
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.grade}</p>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  &ldquo;{testimonial.testimonial}&rdquo;
                </p>
                <div className="flex mt-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">{t("homepage.platformFeatures")}</h2>
            <p className="text-muted-foreground">{t("homepage.discoverFeatures")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-brand" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("homepage.highQuality")}</h3>
              <p className="text-muted-foreground">{t("homepage.highQualityDesc")}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-brand" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("homepage.activeCommunity")}</h3>
              <p className="text-muted-foreground">{t("homepage.activeCommunityDesc")}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-6 w-6 text-brand" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("homepage.certificates")}</h3>
              <p className="text-muted-foreground">{t("homepage.certificatesDesc")}</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("homepage.startLearningJourney")}</h2>
            <p className="text-muted-foreground mb-8">
              {t("homepage.joinUsToday")}
            </p>
            <Button size="lg" asChild className="bg-brand hover:bg-brand/90 text-white">
              <Link href="/sign-up">
                {t("homepage.signUpNow")} <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Floating Social Media Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 items-end" dir="ltr">
        {/* Facebook Button */}
        <motion.a
          href="https://www.facebook.com/mohammed.elhetimy?rdid=bUJIFBhaBf8cShjz&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1Ao3YCvEkQ%2F#"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center flex-row gap-3 group cursor-pointer"
          aria-label="Facebook"
        >
          <span className="bg-[#1877F2] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold whitespace-nowrap">
            {t("homepage.facebookLabel")}
          </span>
          <div className="w-14 h-14 bg-[#1877F2] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow flex-shrink-0">
            <svg
              className="w-7 h-7 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
        </motion.a>

        {/* WhatsApp Button */}
        <motion.a
          href="https://wa.me/201005224432"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center flex-row gap-3 group cursor-pointer"
          aria-label="WhatsApp"
        >
          <span className="bg-[#25D366] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold whitespace-nowrap">
            {t("homepage.whatsappLabel")}
          </span>
          <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow flex-shrink-0">
            <svg
              className="w-7 h-7 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </div>
        </motion.a>
      </div>
      </div>
  );
} 