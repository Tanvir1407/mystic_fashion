/**
 * UploadedImage — wrapper around next/image for runtime-uploaded files.
 *
 * Why unoptimized for /uploads/* ?
 * Next.js image optimizer caches results in-memory. If the optimizer
 * makes its first request to a newly-written file before the disk write
 * fully flushes (race condition on the VPS), it caches a 404. All
 * subsequent requests serve that cached 404 until pm2 restart clears
 * the in-memory cache.
 *
 * Using unoptimized=true for /uploads/* means Next.js serves the file
 * directly from disk on every request — no in-memory cache, no problem.
 * Other images (logo, icons, hero slides etc.) still go through the
 * optimizer and get WebP conversion + responsive sizing.
 */
import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { Package } from "lucide-react";

type UploadedImageProps = ImageProps & { src: string };

export default function UploadedImage({ src, alt, ...props }: UploadedImageProps) {
  const [error, setError] = useState(false);
  const isRuntimeUpload =
    typeof src === "string" && src.startsWith("/uploads/");

  if (error || !src) {
    return (
      <div className="w-full h-full bg-slate-50 border border-slate-200/60 flex flex-col items-center justify-center text-slate-400 rounded-lg">
        <Package className="w-5 h-5 text-slate-300" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={isRuntimeUpload}
      onError={() => setError(true)}
      {...props}
    />
  );
}
