import type { Locale } from "../i18n";
import type { ModuleId } from "./types";

const connections = [
  {
    code: "POL", title: "Programming Languages", modules: ["toolchain"],
    url: () => "https://pol.aserdargun.com/",
    tr: "Aynı programı farklı dillerde karşılaştır; tür, bellek ve eşzamanlılık kararlarını burada C++ ve Python çalışmalarına taşı. POL yalnızca İngilizcedir; çalıştırılmış ve elle incelenmiş örnekleri ayrı gösterir.",
    en: "Compare the same program across languages, then bring type, memory, and concurrency decisions back to C++ and Python here. POL is English only and distinguishes executed examples from hand-reviewed ones.",
  },
  {
    code: "LLM", title: "LLM Runtime & Serving Atlas", modules: ["inference", "multigpu", "systems"],
    url: (locale: Locale) => `https://llm.aserdargun.com/${locale}`,
    tr: "Kernel düzeyindeki kazanımı çalışma zamanı ve sunum sistemi bağlamında değerlendir; iş yükünü, arka ucu ve donanım sınırlarını birlikte incele.",
    en: "Evaluate kernel improvements in the context of runtimes and serving systems; consider workload, backend, and hardware boundaries together.",
  },
  {
    code: "TFL", title: "Token Flow Laboratory", modules: ["operators", "inference"],
    url: (locale: Locale) => `https://tfl.aserdargun.com/?lang=${locale}`,
    tr: "Bir isteği kuyruk, prefill, KV önbelleği ve decode boyunca izle. Süreler ve çıktılar eğitim amaçlıdır; gerçek çıkarım ölçümü değildir.",
    en: "Follow a request through queueing, prefill, KV cache, and decode. Timings and outputs are educational, not measured inference.",
  },
];

export function LearningConnections({ locale, moduleId }: { locale: Locale; moduleId?: ModuleId }) {
  const related = moduleId ? connections.filter(({ modules }) => modules.includes(moduleId)) : connections;
  if (!related.length) return null;
  const tr = locale === "tr";
  return (
    <section className="learning-connections section-block" aria-labelledby="learning-connections-title">
      <div className="section-heading">
        <div><span>ASERDARGUN.COM · {tr ? "BAĞLANTILI ÖĞRENME" : "CONNECTED LEARNING"}</span><h2 id="learning-connections-title">{tr ? "Kernel’den sisteme." : "From kernel to system."}</h2></div>
        <p>{tr ? "GPU, öğrenme sisteminin hesaplama temelidir. Bu uygulamalar arasında konuya göre ilerle; her uygulama bağımsız çalışır ve ilerleme kaydın aktarılmaz." : "GPU provides the compute foundation of the learning system. Follow these paths by topic; each application runs independently and your progress is not transferred."}</p>
      </div>
      <nav className="learning-connection-grid" aria-label={tr ? "İlgili öğrenme uygulamaları" : "Related learning applications"}>
        {related.map((item) => (
          <a key={item.code} href={item.url(locale)} target="_blank" rel="noopener noreferrer">
            <b>{item.code} · {item.title}</b><p>{item[locale]}</p><small>{tr ? "Yeni sekmede aç ↗" : "Open in a new tab ↗"}</small>
          </a>
        ))}
      </nav>
    </section>
  );
}
