import type { Locale } from "../i18n";
import type { ModuleId } from "./types";

const lessons = [
  { mode: "anatomy", tr: "GPU anatomisi", en: "GPU anatomy", modules: ["visual"] },
  { mode: "sm", tr: "SM’in içi", en: "Inside an SM", modules: ["visual", "architecture"] },
  { mode: "kernel", tr: "Kernel başlatma", en: "Kernel launch", modules: ["architecture"] },
  { mode: "warp", tr: "Warp / SIMT", en: "Warp / SIMT", modules: ["architecture"] },
  { mode: "memory", tr: "Bellek yolculuğu", en: "Memory journey", modules: ["memory"] },
  { mode: "tensor", tr: "Tensor Core / döşemeli GEMM", en: "Tensor Core / tiled GEMM", modules: ["operators", "cutlass"] },
];

export function GexCompanion({ locale, moduleId }: { locale: Locale; moduleId?: ModuleId }) {
  const related = moduleId ? lessons.filter((lesson) => lesson.modules.includes(moduleId)) : lessons;
  if (!related.length) return null;
  const tr = locale === "tr";

  return (
    <section className="gex-companion section-block" aria-labelledby="gex-title">
      <div className="section-heading">
        <div>
          <span>{tr ? "BAĞLANTILI UYGULAMA · 3B KEŞİF" : "COMPANION APP · 3D EXPLORATION"}</span>
          <h2 id="gex-title">GEX <em>GPU Execution Explorer</em></h2>
        </div>
        <p>{tr
          ? "GPU Kernel Atlas’ta teori, kod ve ölçüm yöntemlerini öğren; GEX’te GPU bileşenlerini ve yürütme adımlarını etkileşimli 3B sahneler ve zaman çizelgesiyle keşfet. Ardından buradaki laboratuvarda öğrendiklerini uygula."
          : "Learn theory, code, and measurement methods in GPU Kernel Atlas; explore GPU components and execution steps through interactive 3D scenes and a timeline in GEX. Then apply what you learned in the labs here."}</p>
      </div>
      <nav className="gex-lessons" aria-label={tr ? "GEX dersleri (yeni sekme)" : "GEX lessons (new tab)"}>
        {related.map((lesson) => (
          <a key={lesson.mode} href={`https://gex.aserdargun.com/gex/${lesson.mode}?lang=${locale}`} target="_blank" rel="noopener noreferrer">
            {lesson[locale]} <span aria-hidden="true">↗</span>
            <small>{tr ? "GEX’te aç · yeni sekme" : "Open in GEX · new tab"}</small>
          </a>
        ))}
      </nav>
      <p className="preview-caveat">{tr
        ? "GEX eğitim amaçlı kavramsal modeller kullanır; gerçek çip yerleşimi, çevrim doğruluğunda simülasyon veya ölçülmüş performans sonucu sunmaz."
        : "GEX uses conceptual educational models; it does not present a physical chip floorplan, cycle-accurate simulation, or measured performance results."}</p>
    </section>
  );
}
