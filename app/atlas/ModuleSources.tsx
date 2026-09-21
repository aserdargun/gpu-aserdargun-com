import type { Locale } from "../i18n";
import type { ModuleId } from "./types";
import { getSourcesForModule } from "./curriculum-sources";
import type { CurriculumSource } from "./curriculum-sources";
import { uiByLocale } from "./copy";

export function ModuleSources({ locale, moduleId }: { locale: Locale; moduleId: ModuleId }) {
  const tr = locale === "tr";
  // Several claims can share one document. Show each document once, with all
  // associated maturity labels and the oldest review date for that document.
  const documents = new Map<string, CurriculumSource[]>();
  for (const source of getSourcesForModule(moduleId)) {
    const entries = documents.get(source.url) ?? [];
    entries.push(source);
    documents.set(source.url, entries);
  }
  return (
    <section className="module-sources section-block" aria-labelledby="module-sources-title">
      <h2 id="module-sources-title">{tr ? "Kaynaklar ve doğrulama bağlamı" : "Sources and verification context"}</h2>
      <p>{tr ? "Tarihler belge incelemesini gösterir; yerel GPU testi veya bu cihaz için destek garantisi değildir. Kurulum ve ölçüm öncesinde sürüm, mimari ve arka uç gereksinimlerini kaynakta yeniden kontrol et." : "Dates record document reviews, not local GPU tests or guaranteed support on this device. Recheck version, architecture, and backend requirements in the source before setup or measurement."}</p>
      <ul>
        {[...documents].map(([url, sources]) => {
          const reviewedAt = sources.map(({ verifiedAt }) => verifiedAt).sort()[0];
          return <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer">{sources[0].title}<span className="atlas-visually-hidden">{tr ? " (yeni sekme)" : " (new tab)"}</span> ↗</a>
            <small>{[...new Set(sources.map(({ maturity }) => uiByLocale[locale].maturityLabels[maturity]))].join(" · ")} · {tr ? "Belge incelemesi" : "Document review"}: <time dateTime={reviewedAt}>{reviewedAt}</time></small>
          </li>;
        })}
      </ul>
    </section>
  );
}
