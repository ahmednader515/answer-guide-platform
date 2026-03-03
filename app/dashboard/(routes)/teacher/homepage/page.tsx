import { HomepageEditor } from "./_components/homepage-editor";
import { LayoutDashboard } from "lucide-react";

export default function TeacherHomepagePage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-brand/10">
          <LayoutDashboard className="h-6 w-6 text-brand" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">تعديل محتوى الصفحة الرئيسية</h1>
          <p className="text-sm text-muted-foreground">
            عدّل النصوص والصور والروابط التي تظهر في الصفحة الرئيسية للمنصة
          </p>
        </div>
      </div>
      <HomepageEditor />
    </div>
  );
}
