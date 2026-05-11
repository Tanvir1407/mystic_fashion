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

type UploadedImageProps = ImageProps & { src: string };

export default function UploadedImage({ src, ...props }: UploadedImageProps) {
  const isRuntimeUpload =
    typeof src === "string" && src.startsWith("/uploads/");

  return <Image src={src} unoptimized={isRuntimeUpload} {...props} />;
}
