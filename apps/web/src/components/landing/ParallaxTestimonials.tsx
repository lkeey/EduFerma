"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@eduferma/ui";
import type { PublicResult } from "@eduferma/core";

type ParallaxTestimonialsProps = {
  results: PublicResult[];
};

const fallbackResults: PublicResult[] = [
  {
    title: "Маршрут стал понятнее",
    summary: "Демо-кейс: ученик видит ближайшее занятие, дедлайн и что именно повторить перед уроком.",
    published: true,
    consent_status: "granted"
  },
  {
    title: "Меньше ручной рутины",
    summary: "Демо-кейс: преподаватель собирает ДЗ из проверенных прототипов и сразу видит риск по навыкам.",
    published: true,
    consent_status: "granted"
  }
];

export function ParallaxTestimonials({ results }: ParallaxTestimonialsProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const visibleResults = results.length > 0 ? results : fallbackResults;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileViewport = window.matchMedia("(max-width: 700px)");

    if (reducedMotion.matches || mobileViewport.matches) {
      section.style.setProperty("--parallax-a", "0px");
      section.style.setProperty("--parallax-b", "0px");
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = Math.max(-1, Math.min(1, (viewport * 0.5 - rect.top) / Math.max(rect.height, 1)));
      section.style.setProperty("--parallax-a", `${Math.round(progress * 24)}px`);
      section.style.setProperty("--parallax-b", `${Math.round(progress * -18)}px`);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <div ref={sectionRef} className="landing-testimonials">
      <div className="landing-testimonial-stage" aria-label="Демо-отзывы EduFerma">
        <div className="landing-testimonial-rail landing-testimonial-rail-a">
          {visibleResults.map((result) => (
            <article className="landing-testimonial-card" key={result.title}>
              <Badge>demo safe</Badge>
              <h3>{result.title}</h3>
              <p>{result.summary}</p>
            </article>
          ))}
        </div>
        <div className="landing-testimonial-rail landing-testimonial-rail-b" aria-hidden="true">
          <div className="landing-review-metric">
            <strong>consent-first</strong>
            <span>реальные отзывы только после `published=true` и `consent_status=granted`</span>
          </div>
          <div className="landing-review-metric">
            <strong>0 teacher fields</strong>
            <span>в публичный слой не уходят ответы, решения и внутренние заметки</span>
          </div>
        </div>
      </div>
    </div>
  );
}
