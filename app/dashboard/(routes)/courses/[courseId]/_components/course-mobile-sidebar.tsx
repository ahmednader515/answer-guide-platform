"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, File } from "lucide-react";
import { IconBadge } from "@/components/icon-badge";
import { Button } from "@/components/ui/button";

interface CourseMobileSidebarProps {
    chapters: {
        id: string;
        title: string;
        isCompleted: boolean;
        isFree: boolean;
    }[];
    progressCount: number;
}

export const CourseMobileSidebar = ({
    chapters,
    progressCount,
}: CourseMobileSidebarProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Avoid Radix Sheet ID hydration mismatches that remount the course layout / video
    if (!mounted) {
        return (
            <div
                className="md:hidden pr-4 h-10 w-10 shrink-0"
                aria-hidden="true"
            />
        );
    }

    return (
        <Sheet>
            <SheetTrigger className="md:hidden pr-4 hover:opacity-75 transition">
                <Button variant="ghost" size="sm">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
                <div className="flex flex-col h-full">
                    <div className="p-4 flex flex-col border-b">
                        <h2 className="font-semibold mb-1">
                            Course Content
                        </h2>
                        <span className="text-sm text-slate-500">
                            {progressCount}/{chapters.length} chapters completed
                        </span>
                    </div>
                    <div className="flex flex-col overflow-y-auto">
                        {chapters.map((chapter) => (
                            <button
                                key={chapter.id}
                                className="p-4 border-b hover:bg-slate-50 flex items-center gap-x-2 text-slate-700 text-sm transition-colors"
                            >
                                <div className="flex items-center gap-x-2 flex-1">
                                    <IconBadge icon={File} size="sm" />
                                    {chapter.title}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
