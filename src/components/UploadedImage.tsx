"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { Package } from "lucide-react";

type UploadedImageProps = ImageProps & { src: string };

export default function UploadedImage({ src, alt, ...props }: UploadedImageProps) {
  const [error, setError] = useState(false);
  const [fellback, setFellback] = useState<string | null>(null);

  // /uploads/* images are served directly — bypassing the Next.js optimizer.
  // The optimizer runs conversion in-process (AVIF/WebP encoding is CPU-heavy)
  // and on a constrained VPS can spike CPU and bring the server down when many
  // images are requested simultaneously. Serving raw files avoids that entirely.
  const isRuntimeUpload = typeof src === "string" && src.startsWith("/uploads/");

  const handleError = () => {
    // If the requested .webp file doesn't exist on disk (e.g., legacy images
    // not yet converted), try common fallback extensions in order.
    if (
      typeof src === "string" &&
      src.startsWith("/uploads/") &&
      src.endsWith(".webp")
    ) {
      const fallbackExtensions = [".jpg", ".png", ".jpeg"];
      const tried = fellback || src;
      const next = fallbackExtensions.find(ext => {
        const candidate = src.replace(/\.webp$/, ext);
        return candidate !== tried;
      });
      if (next) {
        setFellback(src.replace(/\.webp$/, next));
        return; // re-render with fallback extension
      }
    }
    setError(true);
  };

  const displaySrc = fellback || src;

  if (error || !displaySrc) {
    return (
      <div className="w-full h-full bg-slate-50 border border-slate-200/60 flex flex-col items-center justify-center text-slate-400 rounded-lg">
        <Package className="w-5 h-5 text-slate-300" />
      </div>
    );
  }

  return (
    <Image
      src={displaySrc}
      alt={alt}
      unoptimized={isRuntimeUpload}
      onError={handleError}
      {...props}
    />
  );
}
