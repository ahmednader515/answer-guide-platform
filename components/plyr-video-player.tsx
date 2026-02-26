"use client";

import { useEffect, useRef, useState } from "react";
import "plyr/dist/plyr.css";
import { Rewind, FastForward, Settings2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/contexts/language-context";

const YOUTUBE_QUALITY_TUTORIAL_VIDEO_ID = "hZulbl4ht4k";
const VIDEO_PROGRESS_KEY_PREFIX = "video-progress-";

function getStorageKey(youtubeVideoId?: string | null, videoUrl?: string | null): string {
  if (youtubeVideoId) return `${VIDEO_PROGRESS_KEY_PREFIX}yt-${youtubeVideoId}`;
  if (videoUrl) return `${VIDEO_PROGRESS_KEY_PREFIX}url-${videoUrl}`;
  return `${VIDEO_PROGRESS_KEY_PREFIX}unknown`;
}

interface PlyrVideoPlayerProps {
  videoUrl?: string;
  youtubeVideoId?: string;
  videoType?: "UPLOAD" | "YOUTUBE";
  storageKey?: string;
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export const PlyrVideoPlayer = ({
  videoUrl,
  youtubeVideoId,
  videoType = "UPLOAD",
  storageKey: propStorageKey,
  className,
  onEnded,
  onTimeUpdate
}: PlyrVideoPlayerProps) => {
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const { t } = useLanguage();

  const progressStorageKey = propStorageKey ?? getStorageKey(youtubeVideoId, videoUrl);

  const handleQualityDialogClose = (open: boolean) => {
    if (!open) {
      window.location.reload();
    }
    setQualityDialogOpen(open);
  };

  const handleSeek = (seconds: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const player = playerRef.current;
    if (!player) return;
    const newTime = Math.max(0, (player.currentTime || 0) + seconds);
    const duration = player.duration ?? Infinity;
    player.currentTime = Math.min(newTime, duration);
  };

  // Initialize Plyr on mount/update and destroy on unmount
  useEffect(() => {
    let isCancelled = false;
    let beforeUnloadHandler: (() => void) | null = null;

    async function setupPlayer() {
      const targetEl =
        videoType === "YOUTUBE" ? youtubeContainerRef.current : html5VideoRef.current;
      if (!targetEl) return;

      let savedStartTime = 0;
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(progressStorageKey);
          if (saved) {
            const t = parseFloat(saved);
            if (Number.isFinite(t) && t > 0) savedStartTime = Math.floor(t);
          }
        } catch {
          // Ignore
        }
      }

      if (videoType === "YOUTUBE" && targetEl instanceof HTMLElement) {
        targetEl.innerHTML = "";
        targetEl.setAttribute("data-plyr-provider", "youtube");
        targetEl.setAttribute("data-plyr-embed-id", youtubeVideoId!);
      }

      // Dynamically import Plyr to be SSR-safe
      const plyrModule: any = await import("plyr");
      const Plyr: any = plyrModule.default ?? plyrModule;

      if (isCancelled) return;

      // Destroy any previous instance
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore destroy errors
        }
        playerRef.current = null;
      }
      setIsPlayerReady(false);

      const youtubeConfig: Record<string, unknown> = { rel: 0, modestbranding: 1 };
      if (videoType === "YOUTUBE" && savedStartTime > 0) {
        youtubeConfig.start = savedStartTime;
      }

      const player = new Plyr(targetEl, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen"
        ],
        settings: videoType === "YOUTUBE" ? ["speed", "loop"] : ["speed", "quality", "loop"],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        youtube: youtubeConfig,
        ratio: "16:9"
      });

      playerRef.current = player;

      player.on("ended", () => {
        try {
          localStorage.removeItem(progressStorageKey);
        } catch {
          // Ignore
        }
        onEnded?.();
      });
      let lastSaved = 0;
      const saveInterval = 1000;
      player.on("timeupdate", () => {
        const t = player.currentTime || 0;
        onTimeUpdate?.(t);
        if (typeof window !== "undefined" && Date.now() - lastSaved > saveInterval) {
          lastSaved = Date.now();
          try {
            localStorage.setItem(progressStorageKey, String(t));
          } catch {
            // Ignore storage errors
          }
        }
      });
      player.on("play", () => setIsPaused(false));
      player.on("pause", () => {
        setIsPaused(true);
        const t = player.currentTime || 0;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(progressStorageKey, String(t));
          } catch {
            // Ignore storage errors
          }
        }
      });
      const seekToSaved = () => {
        try {
          const saved = localStorage.getItem(progressStorageKey);
          if (saved) {
            const time = parseFloat(saved);
            if (Number.isFinite(time) && time > 0) {
              player.currentTime = time;
            }
          }
        } catch {
          // Ignore
        }
      };

      player.on("ready", () => {
        setIsPlayerReady(true);
        setIsPaused(true);
        if (videoType !== "YOUTUBE") {
          seekToSaved();
        }
      });

      beforeUnloadHandler = () => {
        const p = playerRef.current;
        if (p && typeof p.currentTime === "number") {
          try {
            localStorage.setItem(progressStorageKey, String(p.currentTime));
          } catch {
            // Ignore
          }
        }
      };
      window.addEventListener("beforeunload", beforeUnloadHandler);
      window.addEventListener("pagehide", beforeUnloadHandler);
    }

    setupPlayer();

    return () => {
      if (beforeUnloadHandler) {
        window.removeEventListener("beforeunload", beforeUnloadHandler);
        window.removeEventListener("pagehide", beforeUnloadHandler);
      }
      isCancelled = true;
      setIsPlayerReady(false);
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore destroy errors (e.g. YouTube API not attached)
        }
      }
      playerRef.current = null;
    };
  }, [videoUrl, youtubeVideoId, videoType, onEnded, onTimeUpdate, progressStorageKey]);

  const hasVideo = (videoType === "YOUTUBE" && !!youtubeVideoId) || !!videoUrl;

  if (!hasVideo) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}>
        <div className="text-muted-foreground">{t("common.noVideo")}</div>
      </div>
    );
  }

  return (
    <div className={`aspect-video relative ${className || ""}`}>
      {videoType === "YOUTUBE" && youtubeVideoId ? (
        <div className="relative w-full h-full">
          {/* Poster - always in DOM, visible when paused to hide "More videos" */}
          <div
            className={`absolute inset-0 z-[5] bg-cover bg-center rounded-lg cursor-pointer transition-opacity duration-200 ${
              isPlayerReady && isPaused ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            style={{
              backgroundImage: `url(https://i.ytimg.com/vi/${youtubeVideoId}/sddefault.jpg)`,
            }}
            onClick={() => playerRef.current?.play?.()}
            onKeyDown={(e) => e.key === "Enter" && playerRef.current?.play?.()}
            role="button"
            tabIndex={isPlayerReady && isPaused ? 0 : -1}
            aria-label={t("videoPlayer.play")}
            aria-hidden={!(isPlayerReady && isPaused)}
          >
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors rounded-lg">
              <div className="rounded-full bg-white/20 p-4 hover:bg-white/30 transition-colors">
                <Play className="h-12 w-12 text-white fill-white" />
              </div>
            </div>
          </div>
          <div
            ref={youtubeContainerRef}
            data-plyr-provider="youtube"
            data-plyr-embed-id={youtubeVideoId}
            className={`w-full h-full [&>iframe]:rounded-lg ${isPlayerReady && isPaused ? "invisible absolute inset-0 pointer-events-none" : ""}`}
          />
        </div>
      ) : (
        <video
          ref={html5VideoRef}
          className="w-full h-full"
          playsInline
          crossOrigin="anonymous"
          preload="metadata"
          key={videoUrl}
        >
          {videoUrl ? (
            <>
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
              <source src={videoUrl} type="video/ogg" />
              Your browser does not support the video tag.
            </>
          ) : null}
        </video>
      )}

      {/* Custom control buttons overlay */}
      <div className="absolute top-2 end-2 z-10 flex items-center gap-1 pointer-events-auto">
        <div className="flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded-lg px-1.5 py-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onPointerDown={handleSeek(10)}
            disabled={!isPlayerReady}
            title={t("videoPlayer.forward10s")}
          >
            <FastForward className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onPointerDown={handleSeek(-10)}
            disabled={!isPlayerReady}
            title={t("videoPlayer.back10s")}
          >
            <Rewind className="h-4 w-4" />
          </Button>
          {videoType === "YOUTUBE" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => setQualityDialogOpen(true)}
              title={t("videoPlayer.changeQuality")}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* YouTube Quality Tutorial Dialog */}
      <Dialog open={qualityDialogOpen} onOpenChange={handleQualityDialogClose}>
        <DialogContent className="max-w-[95vw] w-[95vw] lg:max-w-[1200px] lg:w-[1200px] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("videoPlayer.qualityTutorialTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-0">
            {/* YouTube tutorial video */}
            <div className="w-full lg:min-w-[640px] lg:flex-1 aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${YOUTUBE_QUALITY_TUTORIAL_VIDEO_ID}?rel=0`}
                title="YouTube quality tutorial"
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {/* Tutorial steps */}
            <div className="lg:w-64 shrink-0 space-y-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{t("videoPlayer.qualityTutorialStep1")}</p>
              <p className="text-sm font-medium">{t("videoPlayer.qualityTutorialStep2")}</p>
              <p className="text-sm font-medium">{t("videoPlayer.qualityTutorialStep3")}</p>
              <p className="text-sm font-medium">{t("videoPlayer.qualityTutorialStep4")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => handleQualityDialogClose(false)}>
              {t("videoPlayer.backToVideo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
