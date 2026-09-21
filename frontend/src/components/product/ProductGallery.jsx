import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export const ProductGallery = ({ images = [], productName = 'Product' }) => {
  const fallback = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80";
  
  const imageList = images.length > 0 ? images : [{ image_url: fallback, alt_text: productName }];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentImage = imageList[selectedIndex]?.image_url || fallback;

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4">
      {/* Thumbnail Bar */}
      {imageList.length > 1 && (
        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto max-h-[500px] py-1">
          {imageList.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-card-sm overflow-hidden border-2 shrink-0 transition-all bg-slate-50 ${
                selectedIndex === idx
                  ? 'border-accent shadow-subtle ring-2 ring-blue-100'
                  : 'border-line hover:border-slate-400 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.image_url}
                alt={img.alt_text || `${productName} view ${idx + 1}`}
                onError={(e) => { e.target.src = fallback; }}
                className="w-full h-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Showcase Image */}
      <div className="relative flex-1 aspect-square rounded-card-lg overflow-hidden bg-surface border border-line flex items-center justify-center group shadow-subtle">
        <img
          src={currentImage}
          alt={imageList[selectedIndex]?.alt_text || productName}
          onError={(e) => { e.target.src = fallback; }}
          className={`w-full h-full object-cover object-center transition-transform duration-300 ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />

        {/* Zoom Hint Icon */}
        <div className="absolute bottom-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-md border border-line text-ink-secondary pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-4 h-4" />
        </div>

        {/* Prev / Next Arrows */}
        {imageList.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md border border-line text-ink-primary hover:bg-white flex items-center justify-center shadow-subtle opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md border border-line text-ink-primary hover:bg-white flex items-center justify-center shadow-subtle opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
