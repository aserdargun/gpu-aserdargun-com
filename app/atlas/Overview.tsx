import type { Locale } from "../i18n";
import { ArchitectureMatrix } from "./ArchitectureMatrix";
import { uiByLocale } from "./copy";
import { roadmapByLocale } from "./module-registry";
import type { AtlasModule, ModuleId } from "./types";

export type OverviewProps = {
  locale: Locale;
  modules: readonly AtlasModule[];
  completedIds: readonly ModuleId[];
  lastVisitedId: ModuleId | null;
  onOpenModule: (id: ModuleId) => void;
};

export function Overview({ locale, modules, completedIds, lastVisitedId, onOpenModule }: OverviewProps) {
  const copy = uiByLocale[locale];
  const weeks = roadmapByLocale[locale];
  const resumeModule = modules.find((module) => module.id === lastVisitedId) ?? null;

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> {copy.eyebrow}</div>
          <h1>{copy.headlineA}<br /><em>{copy.headlineB}</em><br />{copy.headlineC}</h1>
          <p>{copy.hero}</p>
          <div className="hero-actions">
            {resumeModule ? (
              <button data-testid="atlas-continue" className="primary" onClick={() => onOpenModule(resumeModule.id)}>
                {copy.continue}: {resumeModule.title} <span>→</span>
              </button>
            ) : (
              <button data-testid="atlas-start" className="primary" onClick={() => onOpenModule("toolchain")}>
                {copy.start} <span>→</span>
              </button>
            )}
            <a className="secondary" href="#roadmap">{copy.viewWeeks}</a>
          </div>
          <div className="hero-stats">
            <div><b>11</b><span>{copy.atlasStat}</span></div>
            <div><b>12</b><span>{copy.weekStat}</span></div>
            <div><b>5</b><span>{copy.operatorStat}</span></div>
            <div><b>3</b><span>{copy.gateStat}</span></div>
          </div>
        </div>
        <div className="hero-system" aria-label={locale === "tr" ? "GPU kernel engineering öğrenme sistemi" : "GPU kernel engineering learning system"}>
          <div className="system-head"><span>{copy.graph}</span><b>{copy.online}</b></div>
          <div className="gpu-core">
            <span>CUDA</span><span>TRITON</span><span>{locale === "tr" ? "BELLEK" : "MEMORY"}</span><span>{locale === "tr" ? "İŞLEÇ" : "OPS"}</span>
            <strong>GPU<br />KERNEL</strong>
            <span>NSIGHT</span><span>CUTLASS</span><span>{locale === "tr" ? "ÇIKARIM" : "INFERENCE"}</span><span>NCCL</span>
          </div>
          <div className="signal-row"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="system-readout">
            <span>{locale === "tr" ? "MİMARİ" : "ARCH"} Ada → Hopper → Blackwell → Rubin</span>
            <span>{locale === "tr" ? "TEMPO 14–16 sa/hafta" : "TRACK 14–16 h/w"}</span>
            <span>{locale === "tr" ? "MOD kanıt-öncelikli" : "MODE evidence-first"}</span>
          </div>
        </div>
      </section>

      <ArchitectureMatrix locale={locale} />

      <section className="maturity-policy section-block" data-testid="atlas-maturity-policy" aria-labelledby="maturity-policy-title">
        <div className="section-heading">
          <div><span>{copy.maturity}</span><h2 id="maturity-policy-title">{locale === "tr" ? "Olgunluğu ayır." : "Separate maturity."}<br /><em>{locale === "tr" ? "Kanıtı sınırla." : "Bound the evidence."}</em></h2></div>
          <p>{copy.evidencePolicy}</p>
        </div>
        <div className="architecture-grid">
          {(["core", "current", "preview"] as const).map((maturity) => (
            <article className={`architecture-card ${maturity}`} data-maturity={maturity} key={maturity}>
              <span className={`freshness-badge ${maturity}`}>{copy.maturityLabels[maturity]}</span>
              <h3>{copy.maturityLabels[maturity]}</h3>
              <p>{copy.maturityDefinitions[maturity]}</p>
            </article>
          ))}
        </div>
        <p className="preview-caveat">{copy.simulationCaveat}</p>
      </section>

      <section className="principles">
        <article><span>01</span><div><b>{copy.correctness}</b><p>{copy.principle1}</p></div></article>
        <article><span>02</span><div><b>{copy.measurement}</b><p>{copy.principle2}</p></div></article>
        <article><span>03</span><div><b>{copy.integration}</b><p>{copy.principle3}</p></div></article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span>{copy.map}</span><h2>{copy.mapA}<br /><em>{copy.mapB}</em></h2></div><p>{copy.mapNote}</p></div>
        <div className="module-grid">
          {modules.map((module) => (
            <button className={`module-card ${module.accent}`} key={module.id} onClick={() => onOpenModule(module.id)}>
              <div>
                <span>{module.index} / {module.phase}</span>
                {completedIds.includes(module.id) ? <b className="done-pill">{copy.done}</b> : null}
              </div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              <footer><span>{module.tags.slice(0, 3).join(" · ")}</span><b>↗</b></footer>
            </button>
          ))}
        </div>
      </section>

      <section className="roadmap section-block" id="roadmap">
        <div className="section-heading light"><div><span>{copy.route}</span><h2>{copy.routeA}<br /><em>{copy.routeB}</em></h2></div><p>{copy.routeNote}</p></div>
        <div className="week-list">
          {weeks.map((week) => (
            <article key={week[0]}><span>{week[0]}</span><div><b>{week[1]}</b><p>{week[2]}</p></div><em>{week[3]}</em></article>
          ))}
        </div>
        <div className="graduation">
          <span>{copy.graduation}</span>
          <div><b>2×</b><p>{copy.dual}</p></div>
          <div><b>≥15%</b><p>{copy.gain}</p></div>
          <div><b>3</b><p>{copy.studies}</p></div>
          <div><b>1</b><p>{copy.report}</p></div>
          <div><b>≥80%</b><p>{copy.interview}</p></div>
        </div>
      </section>
    </>
  );
}
