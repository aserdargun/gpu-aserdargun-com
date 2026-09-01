import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Locale } from "../i18n";
import { architectureMeta } from "./ArchitectureMatrix";
import { uiByLocale } from "./copy";
import type { AtlasModule } from "./types";

export type ModuleFrameProps = {
  module: AtlasModule;
  locale: Locale;
  completed: boolean;
  showCompletionActions: boolean;
  onToggleComplete: () => void;
  onNext: () => void;
  children: ReactNode;
};

export function ModuleFrame({ module, locale, completed, showCompletionActions, onToggleComplete, onNext, children }: ModuleFrameProps) {
  const copy = uiByLocale[locale];
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, behavior: "auto" });
    root.style.scrollBehavior = previousScrollBehavior;
    headingRef.current?.focus({ preventScroll: true });
  }, [module.id]);

  return (
    <div className={`module-page ${module.accent}`}>
      <section className="module-hero">
        <div className="module-kicker"><span>{module.index}</span>{module.phase} · {copy.interactive}</div>
        <div className="module-context">
          <span className={`freshness-badge ${module.maturity}`}>{copy.maturity}: {copy.maturityLabels[module.maturity]}</span>
          <span>{copy.architectures}: {module.architectures.map((id) => `${architectureMeta[id].name} ${architectureMeta[id].capability}`).join(" · ")}</span>
        </div>
        <h1 ref={headingRef} tabIndex={-1} data-testid="atlas-module-title">{module.title}</h1>
        <p>{module.description}</p>
        <div className="tag-row">{module.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        {module.maturity === "preview" || module.architectures.includes("rubin") ? <p className="preview-caveat">{copy.previewCaveat}</p> : null}
      </section>
      <section className="module-foundation">
        <div className="concept-cards">
          {module.concepts.map((concept, index) => <article key={concept}><span>0{index + 1}</span><b>{concept}</b></article>)}
        </div>
        <aside><span>{copy.evidence}</span><p>{module.outcome}</p></aside>
      </section>
      {children}
      {showCompletionActions ? (
        <section className="module-finish">
          <div><span>ATLAS {module.index} / 12</span><h2>{copy.learned}<br /><em>{copy.record}</em></h2></div>
          <div className="finish-actions">
            <button data-testid="atlas-complete" className={completed ? "complete done" : "complete"} onClick={onToggleComplete}>{completed ? copy.completed : copy.complete}</button>
            <button data-testid="atlas-next" className="next" onClick={onNext}>{copy.next}</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
