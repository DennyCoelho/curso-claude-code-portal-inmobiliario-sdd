"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { PublicProperty } from "@portal-inmobiliario/contracts/public-property";
import { sortPropertyImages } from "@/lib/property";
import { PropertyImage } from "./property-image";

type PropertyGalleryProps = Pick<PublicProperty, "title" | "images">;

export function PropertyGallery({ title, images }: PropertyGalleryProps) {
  const galleryId = useId();
  const photos = sortPropertyImages(images);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = Math.max(0, photos.findIndex((image) => image.id === selectedId));
  const selectedImage = photos[selectedIndex];
  const hasMultiplePhotos = photos.length > 1;
  const positionLabel = `Foto ${selectedIndex + 1} de ${photos.length}`;

  function selectPhoto(index: number) {
    const nextIndex = (index + photos.length) % photos.length;
    setSelectedId(photos[nextIndex].id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!hasMultiplePhotos || event.altKey || event.ctrlKey || event.metaKey) return;
    let nextIndex: number;
    switch (event.key) {
      case "ArrowLeft": nextIndex = selectedIndex - 1; break;
      case "ArrowRight": nextIndex = selectedIndex + 1; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = photos.length - 1; break;
      default: return;
    }
    event.preventDefault();
    selectPhoto(nextIndex);
  }

  return (
    <section aria-label="Galeria de fotos" aria-roledescription={hasMultiplePhotos ? "carrossel" : undefined}
      aria-describedby={hasMultiplePhotos ? `${galleryId}-instructions` : undefined}
      onKeyDown={handleKeyDown} className="min-w-0 space-y-4">
      <h2 className="sr-only">Fotos do imóvel</h2>
      <div id={`${galleryId}-photo`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-emerald-50">
        <PropertyImage key={selectedImage ? `${selectedImage.id}:${selectedImage.url}` : "no-image"}
          src={selectedImage?.url} title={selectedImage ? `${title} — ${positionLabel}` : title}
          sizes="(min-width: 1280px) 730px, (min-width: 1024px) 60vw, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)"
          preload={Boolean(selectedImage) && selectedIndex === 0} />
      </div>
      {selectedImage ? (
        <div className="flex min-w-0 items-center justify-between gap-3">
          {hasMultiplePhotos ? (
            <button type="button" aria-label="Foto anterior" aria-controls={`${galleryId}-photo`}
              onClick={() => selectPhoto(selectedIndex - 1)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg text-emerald-900 hover:bg-emerald-50">
              <span aria-hidden="true">←</span>
            </button>
          ) : null}
          <p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-medium text-slate-600">{positionLabel}</p>
          {hasMultiplePhotos ? (
            <button type="button" aria-label="Próxima foto" aria-controls={`${galleryId}-photo`}
              onClick={() => selectPhoto(selectedIndex + 1)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg text-emerald-900 hover:bg-emerald-50">
              <span aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {hasMultiplePhotos ? (
        <>
          <p id={`${galleryId}-instructions`} className="sr-only">Use os botões ou as setas esquerda e direita para navegar pelas fotos. Home abre a primeira foto e End abre a última.</p>
          <ul aria-label="Miniaturas das fotos" className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-4">
            {photos.map((image, index) => (
              <li key={image.id} className="min-w-0">
                <button type="button" aria-label={`Ver foto ${index + 1} de ${photos.length}`}
                  aria-pressed={selectedIndex === index} aria-controls={`${galleryId}-photo`}
                  onClick={() => selectPhoto(index)}
                  className="block min-h-11 w-full rounded-xl border-2 border-slate-200 p-1 hover:border-emerald-500 aria-pressed:border-emerald-700 aria-pressed:bg-emerald-50">
                  <span aria-hidden="true" className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-emerald-50">
                    <PropertyImage key={image.url} src={image.url} title="" compact
                      sizes="(min-width: 1280px) 160px, (min-width: 1024px) 15vw, (min-width: 640px) 18vw, 22vw" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
