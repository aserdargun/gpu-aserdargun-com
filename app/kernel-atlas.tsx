"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "./i18n";
import KernelForgeEmbedded from "./KernelForgeEmbedded";
import KernelForgeEmbeddedEn from "./KernelForgeEmbedded.en";
import CudaSimtEmbedded from "./CudaSimtEmbedded";
import CudaSimtEmbeddedEn from "./CudaSimtEmbedded.en";
import GpuMemoryEmbedded from "./GpuMemoryEmbedded";
import GpuMemoryEmbeddedEn from "./GpuMemoryEmbedded.en";
import PyTorchTritonEmbedded from "./PyTorchTritonEmbedded";
import PyTorchTritonEmbeddedEn from "./PyTorchTritonEmbedded.en";
import LlmKernelPatternsEmbedded from "./LlmKernelPatternsEmbedded";
import LlmKernelPatternsEmbeddedEn from "./LlmKernelPatternsEmbedded.en";
import KernelSafetyEmbedded from "./KernelSafetyEmbedded";
import KernelSafetyEmbeddedEn from "./KernelSafetyEmbedded.en";
import NsightBenchmarkEmbedded from "./NsightBenchmarkEmbedded";
import NsightBenchmarkEmbeddedEn from "./NsightBenchmarkEmbedded.en";
import CutlassCuteEmbedded from "./CutlassCuteEmbedded";
import CutlassCuteEmbeddedEn from "./CutlassCuteEmbedded.en";
import InferenceSystemsEmbedded from "./InferenceSystemsEmbedded";
import InferenceSystemsEmbeddedEn from "./InferenceSystemsEmbedded.en";
import NcclMultiGpuEmbedded from "./NcclMultiGpuEmbedded";
import NcclMultiGpuEmbeddedEn from "./NcclMultiGpuEmbedded.en";
import GpuSoftwareStackEmbedded from "./GpuSoftwareStackEmbedded";
import GpuSoftwareStackEmbeddedEn from "./GpuSoftwareStackEmbedded.en";
import { MODULE_IDS, modulesByLocale } from "./atlas/module-registry";
import { uiByLocale } from "./atlas/copy";
import {
  acquireLocalStorage,
  detectBrowserLanguage,
  readCompleted,
  readLanguage,
  readLastVisited,
  writeCompleted,
  writeLanguage,
  writeLastVisited,
} from "./atlas/state.mjs";
import type { ModuleId } from "./atlas/types";
import { AtlasShell } from "./atlas/AtlasShell";
import { architectureMeta } from "./atlas/ArchitectureMatrix";
import { ModuleFrame } from "./atlas/ModuleFrame";
import { Overview } from "./atlas/Overview";

const validModuleIds = new Set<ModuleId>(MODULE_IDS);

export default function KernelAtlas({ initialLocale }: { initialLocale: Locale }) {
  const [activeId, setActiveId] = useState<ModuleId | null>(null);
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<ModuleId[]>([]);
  const [lastVisitedId, setLastVisitedId] = useState<ModuleId | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const storage = acquireLocalStorage(window);
    const pathLocale: Locale = currentUrl.pathname === "/en" || currentUrl.pathname.startsWith("/en/") ? "en" : "tr";
    const legacyLocale = currentUrl.searchParams.get("lang");
    if ((legacyLocale === "tr" || legacyLocale === "en") && legacyLocale !== pathLocale) {
      writeLanguage(storage, legacyLocale);
      currentUrl.searchParams.delete("lang");
      currentUrl.pathname = legacyLocale === "en" ? "/en/" : "/";
      window.location.replace(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      return;
    }
    if (currentUrl.pathname === "/" && legacyLocale !== "tr" && legacyLocale !== "en") {
      const preferredLocale = readLanguage(storage) ?? detectBrowserLanguage(window);
      if (preferredLocale === "en") {
        currentUrl.pathname = "/en/";
        window.location.replace(`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
        return;
      }
    }
    window.queueMicrotask(() => {
      setCompleted(readCompleted(storage, validModuleIds) as ModuleId[]);
      setLastVisitedId(readLastVisited(storage, validModuleIds) as ModuleId | null);
      setLocale(pathLocale);
      document.documentElement.lang = pathLocale;
      document.documentElement.dataset.atlasReady = "true";
    });
    return () => {
      delete document.documentElement.dataset.atlasReady;
    };
  }, []);

  const modules = modulesByLocale[locale];
  const changeLocale = (next: Locale) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("lang");
    writeLanguage(acquireLocalStorage(window), next);
    url.pathname = next === "en" ? "/en/" : "/";
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  };

  const localeName = locale === "tr" ? "tr-TR" : "en-US";
  const needle = query.trim().toLocaleLowerCase(localeName);
  const maturityLabels = uiByLocale[locale].maturityLabels;
  const filtered = modules.filter((item) => (
    `${item.title} ${item.short} ${item.description} ${item.tags.join(" ")} ${item.architectures.map((id) => {
      const architecture = architectureMeta[id];
      return `${architecture.name} ${architecture.capability} ${architecture.support}`;
    }).join(" ")} ${maturityLabels[item.maturity]}`
      .toLocaleLowerCase(localeName)
      .includes(needle)
  ));

  const active = modules.find((item) => item.id === activeId) ?? null;
  const lab = active == null ? null : renderLab(active.id, locale);
  const progress = Math.round((completed.length / modules.length) * 100);

  const openModule = useCallback((id: ModuleId) => {
    setActiveId(id);
    setLastVisitedId(id);
    writeLastVisited(acquireLocalStorage(window), id);
    setMenuOpen(false);
  }, []);

  const showOverview = useCallback(() => {
    setActiveId(null);
    setMenuOpen(false);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  const toggleComplete = useCallback((id: ModuleId) => {
    setCompleted((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      writeCompleted(acquireLocalStorage(window), next);
      return next;
    });
  }, []);

  const toggleActiveComplete = useCallback(() => {
    if (activeId != null) toggleComplete(activeId);
  }, [activeId, toggleComplete]);

  const openNext = useCallback(() => {
    if (activeId == null) return;
    const index = modules.findIndex((module) => module.id === activeId);
    openModule(modules[(index + 1) % modules.length].id);
  }, [activeId, modules, openModule]);

  return (
    <AtlasShell
      locale={locale}
      progress={progress}
      completedCount={completed.length}
      onLocaleChange={changeLocale}
      onShowOverview={showOverview}
      onToggleMenu={toggleMenu}
      navigationProps={{
        locale,
        modules: filtered,
        activeId,
        completedIds: completed,
        query,
        menuOpen,
        onQueryChange: setQuery,
        onOpenModule: openModule,
        onShowOverview: showOverview,
        onCloseMenu: closeMenu,
      }}
    >
      {active ? (
        <ModuleFrame
          module={active}
          locale={locale}
          completed={completed.includes(active.id)}
          showCompletionActions={lab != null}
          onToggleComplete={toggleActiveComplete}
          onNext={openNext}
        >
          {lab == null ? (
            <section className="module-unavailable" role="alert">
              <p>{uiByLocale[locale].moduleUnavailable}</p>
              <button onClick={showOverview}>{uiByLocale[locale].showOverview}</button>
            </section>
          ) : lab}
        </ModuleFrame>
      ) : (
        <Overview
          locale={locale}
          modules={modules}
          completedIds={completed}
          lastVisitedId={lastVisitedId}
          onOpenModule={openModule}
        />
      )}
    </AtlasShell>
  );
}

function renderLab(kind: ModuleId, locale: Locale): ReactNode | null {
  if (kind === "toolchain") return <ToolchainLab locale={locale} />;
  if (kind === "architecture") return <ArchitectureLab locale={locale} />;
  if (kind === "memory") return <MemoryLab locale={locale} />;
  if (kind === "triton") return <TritonLab locale={locale} />;
  if (kind === "operators") return <OperatorsLab locale={locale} />;
  if (kind === "correctness") return <CorrectnessLab locale={locale} />;
  if (kind === "profiling") return <ProfilingLab locale={locale} />;
  if (kind === "cutlass") return <CutlassLab locale={locale} />;
  if (kind === "inference") return <InferenceLab locale={locale} />;
  if (kind === "multigpu") return <MultiGpuLab locale={locale} />;
  if (kind === "systems") return <SystemsLab locale={locale} />;
  return null;
}

function ToolchainLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <KernelForgeEmbedded /> : <KernelForgeEmbeddedEn />;
}

function ArchitectureLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <CudaSimtEmbedded /> : <CudaSimtEmbeddedEn />;
}

function MemoryLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <GpuMemoryEmbedded /> : <GpuMemoryEmbeddedEn />;
}

function TritonLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <PyTorchTritonEmbedded /> : <PyTorchTritonEmbeddedEn />;
}

function OperatorsLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <LlmKernelPatternsEmbedded /> : <LlmKernelPatternsEmbeddedEn />;
}

function CorrectnessLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <KernelSafetyEmbedded /> : <KernelSafetyEmbeddedEn />;
}

function ProfilingLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <NsightBenchmarkEmbedded /> : <NsightBenchmarkEmbeddedEn />;
}

function CutlassLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <CutlassCuteEmbedded /> : <CutlassCuteEmbeddedEn />;
}

function InferenceLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <InferenceSystemsEmbedded /> : <InferenceSystemsEmbeddedEn />;
}

function MultiGpuLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <NcclMultiGpuEmbedded /> : <NcclMultiGpuEmbeddedEn />;
}

function SystemsLab({ locale }: { locale: Locale }) {
  return locale === "tr" ? <GpuSoftwareStackEmbedded /> : <GpuSoftwareStackEmbeddedEn />;
}
