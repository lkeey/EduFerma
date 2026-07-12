"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function LandingParallaxShell({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const revealItems = Array.from(shell.querySelectorAll<HTMLElement>("[data-reveal]"));
    const navAnchors = Array.from(shell.querySelectorAll<HTMLAnchorElement>(".landing-nav a[href^='#']"));
    const navTargets = navAnchors
      .map((anchor) => {
        const hash = anchor.getAttribute("href");
        const target = hash ? shell.querySelector<HTMLElement>(hash) : null;
        return hash && target ? { hash, anchor, target } : undefined;
      })
      .filter((item): item is { hash: string; anchor: HTMLAnchorElement; target: HTMLElement } => Boolean(item));

    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = anchor?.getAttribute("href");

      if (!anchor || !hash || hash === "#") return;

      const targetElement = document.querySelector<HTMLElement>(hash);
      if (!targetElement) return;

      event.preventDefault();
      targetElement.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
      window.history.pushState(null, "", hash);
    };

    shell.addEventListener("click", handleAnchorClick);

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      shell.style.setProperty("--landing-scroll", progress.toFixed(4));
      shell.style.setProperty("--landing-scroll-percent", `${(progress * 100).toFixed(2)}%`);

      let activeHash = navTargets[0]?.hash;
      const activationLine = window.innerHeight * 0.34;
      navTargets.forEach((item) => {
        if (item.target.getBoundingClientRect().top <= activationLine) {
          activeHash = item.hash;
        }
      });
      navTargets.forEach((item) => {
        if (item.hash === activeHash) {
          item.anchor.dataset.active = "true";
          item.anchor.setAttribute("aria-current", "location");
          return;
        }
        delete item.anchor.dataset.active;
        item.anchor.removeAttribute("aria-current");
      });
    };

    const requestScrollUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };

    if (reducedMotion.matches) {
      shell.dataset.motion = "reduced";
      shell.style.setProperty("--landing-scroll", "0");
      shell.style.setProperty("--landing-pointer-x", "0");
      shell.style.setProperty("--landing-pointer-y", "0");
      revealItems.forEach((item) => {
        item.dataset.revealState = "visible";
      });
      updateScroll();
      window.addEventListener("scroll", requestScrollUpdate, { passive: true });
      window.addEventListener("resize", requestScrollUpdate);

      return () => {
        if (frame) window.cancelAnimationFrame(frame);
        shell.removeEventListener("click", handleAnchorClick);
        window.removeEventListener("scroll", requestScrollUpdate);
        window.removeEventListener("resize", requestScrollUpdate);
      };
    }

    shell.dataset.motion = "active";

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.revealState = "visible";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 }
    );

    const updatePointer = (event: PointerEvent) => {
      if (!finePointer.matches) return;
      const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
      shell.style.setProperty("--landing-pointer-x", x.toFixed(4));
      shell.style.setProperty("--landing-pointer-y", y.toFixed(4));
    };

    updateScroll();
    revealItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        item.dataset.revealState = "visible";
        return;
      }
      revealObserver.observe(item);
    });
    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate);
    window.addEventListener("pointermove", updatePointer, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      revealObserver.disconnect();
      shell.removeEventListener("click", handleAnchorClick);
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
