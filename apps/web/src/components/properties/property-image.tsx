"use client";

import Image from "next/image";
import { useState } from "react";
import { isCloudinaryImageUrl } from "@/lib/property";

interface PropertyImageProps {
  src?: string;
  title: string;
  sizes?: string;
  preload?: boolean;
}

export function PropertyImage({ src, title, sizes = "(min-width: 1280px) 390px, (min-width: 1024px) calc((100vw - 112px) / 3), (min-width: 640px) calc((100vw - 88px) / 2), calc(100vw - 40px)", preload = false }: PropertyImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || !isCloudinaryImageUrl(src) || hasError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-50 text-emerald-800">
        <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className="size-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 22 17-14 17 14M12 19v21h24V19M20 40V27h8v13" />
        </svg>
        <p className="text-sm">Imagem indisponível</p>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      fill
      sizes={sizes}
      preload={preload}
      className="object-cover"
      onError={() => setHasError(true)}
    />
  );
}
