"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function LandingParallaxShell({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");

    if (reducedMotion.matches) {
      shell.dataset.motion = "reduced";
      shell.style.setProperty("--landing-scroll", "0");
      shell.style.setProperty("--landing-pointer-x", "0");
      shell.style.setProperty("--landing-pointer-y", "0");
      return;
    }

    let frame = 0;

    const updateScroll = () => {
      frame = 0;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      shell.style.setProperty("--landing-scroll", progress.toFixed(4));
    };

    const requestScrollUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    const updatePointer = (event: PointerEvent) => {
      if (!finePointer.matches) return;
      const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
      shell.style.setProperty("--landing-pointer-x", x.toFixed(4));
      shell.style.setProperty("--landing-pointer-y", y.toFixed(4));
    };

    updateScroll();
    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate);
    window.addEventListener("pointermove", updatePointer, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestScrollUpdate);
      window.removeEventListener("pointermove", updatePointer);
    };
  }, []);

  return (
    <main ref={shellRef} className="landing-shell">
      {children}
    </main>
  );
}
