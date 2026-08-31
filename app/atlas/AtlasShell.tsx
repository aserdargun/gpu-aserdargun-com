import { useRef } from "react";
import type { ReactNode } from "react";
import type { Locale } from "../i18n";
import { uiByLocale } from "./copy";
import { AtlasNavigation } from "./AtlasNavigation";
import type { AtlasNavigationProps } from "./AtlasNavigation";

export type AtlasShellProps = {
  locale: Locale;
  progress: number;
  completedCount: number;
  navigationProps: Omit<AtlasNavigationProps, "menuButtonRef">;
  onLocaleChange: (locale: Locale) => void;
  onShowOverview: () => void;
  onToggleMenu: () => void;
  children: ReactNode;
};

export function AtlasShell({
  locale,
  progress,
  completedCount,
  navigationProps,
  onLocaleChange,
  onShowOverview,
  onToggleMenu,
  children,
}: AtlasShellProps) {
  const copy = uiByLocale[locale];
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="atlas-app">
      <a className="atlas-skip-link" href="#atlas-content">
        {locale === "tr" ? "İçeriğe geç" : "Skip to content"}
      </a>
      <header className="atlas-topbar">
        <button className="atlas-brand" onClick={onShowOverview} aria-label={copy.home}>
          <span className="atlas-brand-mark">K//A</span>
          <span><b>GPU KERNEL ATLAS</b><small>{locale === "tr" ? "GPU KERNEL MÜHENDİSLİĞİ" : "GPU KERNEL ENGINEERING"}</small></span>
        </button>
        <nav className="atlas-topnav" aria-label={copy.mainNav}>
          <a href="#roadmap" onClick={onShowOverview}>{copy.weeks}</a>
        </nav>
        <div className="atlas-locale" role="group" aria-label={locale === "tr" ? "Dil seçimi" : "Language selection"}>
          <button className={locale === "tr" ? "active" : undefined} onClick={() => onLocaleChange("tr")} aria-pressed={locale === "tr"}>TR</button>
          <button className={locale === "en" ? "active" : undefined} onClick={() => onLocaleChange("en")} aria-pressed={locale === "en"}>EN</button>
        </div>
        <div className="atlas-progress" aria-label={`${copy.progress} ${progress}`}>
          <span>{completedCount}/11 {locale === "tr" ? "ATLAS" : "ATLASES"}</span>
          <i aria-hidden="true"><b style={{ width: `${progress}%` }} /></i>
        </div>
        <button
          ref={menuButtonRef}
          className="atlas-menu-button"
          data-testid="atlas-menu-button"
          onClick={onToggleMenu}
          aria-expanded={navigationProps.menuOpen}
          aria-controls="atlas-drawer"
          aria-label={copy.menu}
        >≡</button>
      </header>

      <div className="atlas-workspace">
        <AtlasNavigation {...navigationProps} menuButtonRef={menuButtonRef} />
        <main className="atlas-content" id="atlas-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
