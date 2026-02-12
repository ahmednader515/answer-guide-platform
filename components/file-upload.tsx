"use client";

import { useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint: "courseImage" | "courseAttachment" | "chapterVideo";
}

// Map endpoints to folder names
const endpointToFolder: Record<string, string> = {
    courseImage: "images",
    courseAttachment: "documents",
    chapterVideo: "videos",
};

export const FileUpload = ({
    onChange,
    endpoint,
}: FileUploadProps) => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [fileName, setFileName] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = async (file: File) => {
        setUploading(true);
        setUploadProgress(0);
        setFileName(file.name);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", endpointToFolder[endpoint] || "uploads");

            // Use fetch with SSE
            const response = await fetch("/api/r2/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            // Parse SSE stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.progress !== undefined) {
                                setUploadProgress(data.progress);
                            } else if (data.done) {
                                setUploadProgress(100);
                                onChange({
                                    url: data.url,
                                    name: data.name,
                                });
                                toast.success("File uploaded successfully!");
                                setUploading(false);
                                setFileName("");
                            } else if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (parseError) {
                            console.error("Failed to parse SSE data:", parseError);
                        }
                    }
                }
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to upload file");
            setUploading(false);
            setUploadProgress(0);
            setFileName("");
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (uploading) return;

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!uploading) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleClick = () => {
        if (!uploading) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="w-full">
            {uploading ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{fileName}</span>
                        <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleClick}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                        isDragging
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-primary/50"
                    )}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept={
                            endpoint === "courseImage"
                                ? "image/*"
                                : endpoint === "chapterVideo"
                                ? "video/*"
                                : "*"
                        }
                    />
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <div className="text-sm font-medium">
                            Click to upload or drag and drop
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {endpoint === "courseImage" && "Image files"}
                            {endpoint === "chapterVideo" && "Video files"}
                            {endpoint === "courseAttachment" && "Any file type"}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};