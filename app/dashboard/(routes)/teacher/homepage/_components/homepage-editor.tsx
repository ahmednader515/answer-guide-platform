"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import {
  ImageIcon,
  Pencil,
  PlusCircle,
  Trash2,
  Save,
  Loader2,
  Globe,
  User,
  MessageSquare,
  Sparkles,
  Megaphone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BilingualText {
  ar: string;
  en: string;
}

interface Testimonial {
  id: string;
  name: string;
  grade: string;
  text: string;
}

interface Feature {
  id: string;
  title: BilingualText;
  description: BilingualText;
}

interface SiteSettingsContent {
  teacherName: BilingualText;
  tagline: BilingualText;
  teacherImageUrl: string;
  logoUrl: string;
  facebookUrl: string;
  whatsappUrl: string;
  testimonials: Testimonial[];
  features: Feature[];
  ctaTitle: BilingualText;
  ctaSubtitle: BilingualText;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ImageUploadField = ({
  label,
  value,
  onUpload,
}: {
  label: string;
  value: string;
  onUpload: (url: string) => void;
}) => {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      {!editing ? (
        <div className="space-y-2">
          {value ? (
            <div className="w-40 h-40 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt={label} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-40 h-40 rounded-lg border bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 ml-1.5" />
            {value ? "تغيير الصورة" : "رفع صورة"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <FileUpload
            endpoint="siteImage"
            onChange={(res) => {
              if (res?.url) {
                onUpload(res.url);
                setEditing(false);
              }
            }}
          />
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            إلغاء
          </Button>
        </div>
      )}
    </div>
  );
};

const BilingualField = ({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: BilingualText;
  onChange: (val: BilingualText) => void;
  multiline?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    <Tabs defaultValue="ar">
      <TabsList className="h-8">
        <TabsTrigger value="ar" className="text-xs h-7">العربية</TabsTrigger>
        <TabsTrigger value="en" className="text-xs h-7">English</TabsTrigger>
      </TabsList>
      <TabsContent value="ar" className="mt-2">
        {multiline ? (
          <Textarea
            value={value.ar}
            onChange={(e) => onChange({ ...value, ar: e.target.value })}
            rows={2}
            dir="rtl"
          />
        ) : (
          <Input
            value={value.ar}
            onChange={(e) => onChange({ ...value, ar: e.target.value })}
            dir="rtl"
          />
        )}
      </TabsContent>
      <TabsContent value="en" className="mt-2">
        {multiline ? (
          <Textarea
            value={value.en}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            rows={2}
            dir="ltr"
          />
        ) : (
          <Input
            value={value.en}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            dir="ltr"
          />
        )}
      </TabsContent>
    </Tabs>
  </div>
);

// ─── Main Editor ──────────────────────────────────────────────────────────────

export const HomepageEditor = () => {
  const [settings, setSettings] = useState<SiteSettingsContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<SiteSettingsContent>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const save = async (section: Partial<SiteSettingsContent>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(section),
      });
      if (!res.ok) throw new Error();
      toast.success("تم الحفظ بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const addTestimonial = () => {
    const newT: Testimonial = {
      id: Date.now().toString(),
      name: "",
      grade: "",
      text: "",
    };
    update({ testimonials: [...(settings?.testimonials ?? []), newT] });
  };

  const removeTestimonial = (id: string) => {
    update({ testimonials: settings?.testimonials.filter((t) => t.id !== id) });
  };

  const updateTestimonial = (id: string, patch: Partial<Testimonial>) => {
    update({
      testimonials: settings?.testimonials.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    });
  };

  const updateFeature = (id: string, patch: Partial<Feature>) => {
    update({
      features: settings?.features.map((f) =>
        f.id === id ? { ...f, ...patch } : f
      ),
    });
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── General Section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-brand" />
            القسم الرئيسي (Hero)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUploadField
              label="صورة المعلم"
              value={settings.teacherImageUrl}
              onUpload={(url) => {
                update({ teacherImageUrl: url });
                save({ teacherImageUrl: url });
              }}
            />
            <ImageUploadField
              label="شعار المنصة (Logo)"
              value={settings.logoUrl}
              onUpload={(url) => {
                update({ logoUrl: url });
                save({ logoUrl: url });
              }}
            />
          </div>
          <BilingualField
            label="اسم المعلم / اسم المنصة"
            value={settings.teacherName}
            onChange={(v) => update({ teacherName: v })}
          />
          <BilingualField
            label="العنوان الفرعي (Tagline)"
            value={settings.tagline}
            onChange={(v) => update({ tagline: v })}
          />
          <div className="flex justify-end">
            <Button
              onClick={() =>
                save({ teacherName: settings.teacherName, tagline: settings.tagline })
              }
              disabled={saving}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ القسم الرئيسي
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Social Links ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-brand" />
            روابط التواصل الاجتماعي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>رابط صفحة Facebook</Label>
            <Input
              value={settings.facebookUrl}
              onChange={(e) => update({ facebookUrl: e.target.value })}
              dir="ltr"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label>رابط WhatsApp</Label>
            <Input
              value={settings.whatsappUrl}
              onChange={(e) => update({ whatsappUrl: e.target.value })}
              dir="ltr"
              placeholder="https://wa.me/20..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() =>
                save({ facebookUrl: settings.facebookUrl, whatsappUrl: settings.whatsappUrl })
              }
              disabled={saving}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ الروابط
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Testimonials ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-brand" />
              آراء الطلاب
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addTestimonial}>
              <PlusCircle className="h-4 w-4 ml-1.5" />
              إضافة رأي
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.testimonials.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا توجد آراء. اضغط "إضافة رأي" للبدء.
            </p>
          )}
          {settings.testimonials.map((t, idx) => (
            <div key={t.id} className="border rounded-lg p-4 space-y-3 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-muted-foreground">رأي {idx + 1}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeTestimonial(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">اسم الطالب</Label>
                  <Input
                    value={t.name}
                    onChange={(e) => updateTestimonial(t.id, { name: e.target.value })}
                    dir="rtl"
                    placeholder="اسم الطالب"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الصف / المرحلة</Label>
                  <Input
                    value={t.grade}
                    onChange={(e) => updateTestimonial(t.id, { grade: e.target.value })}
                    dir="rtl"
                    placeholder="الصف الأول الثانوي"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">نص الرأي</Label>
                <Textarea
                  value={t.text}
                  onChange={(e) => updateTestimonial(t.id, { text: e.target.value })}
                  dir="rtl"
                  rows={2}
                  placeholder="اكتب رأي الطالب هنا..."
                />
              </div>
            </div>
          ))}
          {settings.testimonials.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={() => save({ testimonials: settings.testimonials })}
                disabled={saving}
                className="bg-brand hover:bg-brand/90 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                حفظ الآراء
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Features ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            مميزات المنصة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.features.map((f, idx) => (
            <div key={f.id} className="border rounded-lg p-4 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">الميزة {idx + 1}</p>
              <BilingualField
                label="العنوان"
                value={f.title}
                onChange={(v) => updateFeature(f.id, { title: v })}
              />
              <BilingualField
                label="الوصف"
                value={f.description}
                onChange={(v) => updateFeature(f.id, { description: v })}
                multiline
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              onClick={() => save({ features: settings.features })}
              disabled={saving}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ المميزات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── CTA Section ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand" />
            قسم الدعوة للتسجيل (CTA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BilingualField
            label="العنوان"
            value={settings.ctaTitle}
            onChange={(v) => update({ ctaTitle: v })}
          />
          <BilingualField
            label="العنوان الفرعي"
            value={settings.ctaSubtitle}
            onChange={(v) => update({ ctaSubtitle: v })}
            multiline
          />
          <div className="flex justify-end">
            <Button
              onClick={() =>
                save({ ctaTitle: settings.ctaTitle, ctaSubtitle: settings.ctaSubtitle })
              }
              disabled={saving}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ قسم CTA
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
