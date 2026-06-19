"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { Package } from "lucide-react";

type UploadedImageProps = ImageProps & { src: string };

export default function UploadedImage({ src, alt, ...props }: UploadedImageProps) {
  const [error, setError] = useState(false);

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
      onError={() => setError(true)}
      {...props}
    />
  );
}
