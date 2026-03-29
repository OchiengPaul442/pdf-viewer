import { useState, useEffect } from "react";

export default function useImage(src: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) {
        setImage(img);
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setImage(null);
      }
    };
    img.src = src;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return src ? image : null;
}
