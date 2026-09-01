import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Locale } from "../i18n";
import { uiByLocale } from "./copy";
import { MODULE_IDS } from "./module-registry";
import type { AtlasModule, ModuleId } from "./types";

export type AtlasNavigationProps = {
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  locale: Locale;
  modules: readonly AtlasModule[];
  activeId: ModuleId | null;
  completedIds: readonly ModuleId[];
  query: string;
  menuOpen: boolean;
  onQueryChange: (value: string) => void;
  onOpenModule: (id: ModuleId) => void;
  onShowOverview: () => void;
  onCloseMenu: () => void;
};

type NavigationContentProps = Omit<AtlasNavigationProps, "menuButtonRef" | "menuOpen" | "onCloseMenu"> & {
  testIds: boolean;
};

function NavigationContent({
  locale,
  modules,
  activeId,
  completedIds,
  query,
  onQueryChange,
  onOpenModule,
  onShowOverview,
  testIds,
}: NavigationContentProps) {
  const copy = uiByLocale[locale];

  return (
    <>
      <label className="atlas-search">
        <span aria-hidden="true">⌕</span>
        <span className="atlas-visually-hidden">{copy.search}</span>
        <input
          data-testid={testIds ? "atlas-search" : undefined}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={copy.search}
        />
      </label>
      <button
        className={activeId === null ? "atlas-overview-link selected" : "atlas-overview-link"}
        onClick={onShowOverview}
        aria-current={activeId === null ? "page" : undefined}
      >
        <span aria-hidden="true">⌂</span><b>{copy.command}</b>
      </button>
      <div className="atlas-side-label"><span>{copy.unified}</span><b>{modules.length}</b></div>
      <nav className="atlas-module-nav" aria-label={copy.learningAtlases}>
        {modules.map((item) => (
          <button
            key={item.id}
            data-testid={testIds ? `atlas-module-${item.id}` : undefined}
            onClick={() => onOpenModule(item.id)}
            className={activeId === item.id ? "selected" : undefined}
            aria-current={activeId === item.id ? "page" : undefined}
          >
            <span className={`atlas-module-dot ${item.accent}`} aria-hidden="true">
              {completedIds.includes(item.id) ? "✓" : item.index}
            </span>
            <span>
              <b>{item.title}</b>
              <small>{item.short}</small>
              {completedIds.includes(item.id) ? <span className="atlas-visually-hidden">{copy.completionStatus}</span> : null}
            </span>
          </button>
        ))}
      </nav>
      {modules.length === 0 ? (
        <div className="atlas-search-empty" data-testid={testIds ? "atlas-search-empty" : undefined} role="status">
          <p>{copy.noResults}</p>
          <button data-testid={testIds ? "atlas-search-clear" : undefined} onClick={() => onQueryChange("")}>
            {copy.clearSearch}
          </button>
        </div>
      ) : null}
    </>
  );
}

export function AtlasNavigation({
  menuButtonRef,
  locale,
  modules,
  activeId,
  completedIds,
  query,
  menuOpen,
  onQueryChange,
  onOpenModule,
  onShowOverview,
  onCloseMenu,
}: AtlasNavigationProps) {
  const copy = uiByLocale[locale];
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const returnFocusToMenuButton = useCallback(() => menuButtonRef.current?.focus(), [menuButtonRef]);
  const progress = Math.round((completedIds.length / MODULE_IDS.length) * 100);
  const contentProps = {
    locale,
    modules,
    activeId,
    completedIds,
    query,
    onQueryChange,
    onOpenModule,
    onShowOverview,
  };

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const mobileViewport = window.matchMedia("(max-width: 820px)");
    let shouldReturnFocus = true;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) return;
      shouldReturnFocus = false;
      onCloseMenu();
    };
    mobileViewport.addEventListener("change", handleBreakpointChange);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !drawer.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !drawer.contains(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      mobileViewport.removeEventListener("change", handleBreakpointChange);
      document.body.style.overflow = previousOverflow;
      if (shouldReturnFocus) returnFocusToMenuButton();
    };
  }, [menuOpen, onCloseMenu, returnFocusToMenuButton]);

  return (
    <>
      <aside className="atlas-sidebar">
        <NavigationContent {...contentProps} testIds />
        <div className="atlas-side-foot">
          <div><span>{copy.localProgress}</span><b>{progress}%</b></div>
          <i aria-hidden="true"><b style={{ width: `${progress}%` }} /></i>
          <small>{copy.stored}</small>
        </div>
      </aside>

      {menuOpen ? (
        <div className="atlas-drawer-layer">
          <button className="atlas-drawer-backdrop" tabIndex={-1} onClick={onCloseMenu} aria-label={copy.closeMenu}>
            <span className="atlas-visually-hidden">{copy.closeMenu}</span>
          </button>
          <aside
            ref={drawerRef}
            className="atlas-drawer"
            id="atlas-drawer"
            data-testid="atlas-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={copy.learningAtlases}
          >
            <button ref={closeButtonRef} className="atlas-drawer-close" onClick={onCloseMenu} aria-label={copy.closeMenu}>×</button>
            <NavigationContent {...contentProps} testIds={false} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
