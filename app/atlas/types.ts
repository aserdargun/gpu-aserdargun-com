import type { Locale } from "../i18n";

export type ModuleId =
  | "toolchain" | "architecture" | "memory" | "triton" | "operators"
  | "correctness" | "profiling" | "cutlass" | "inference" | "multigpu" | "systems";

export type Maturity = "core" | "current" | "preview";
export type ArchitectureId = "ada" | "hopper" | "blackwell" | "rubin";
export type Accent = "gold" | "lime" | "cyan" | "violet" | "coral" | "green" | "blue" | "pink" | "orange";

export type AtlasModule = {
  id: ModuleId;
  index: string;
  title: string;
  short: string;
  phase: string;
  description: string;
  concepts: readonly [string, string, string];
  outcome: string;
  tags: readonly string[];
  accent: Accent;
  maturity: Maturity;
  architectures: readonly ArchitectureId[];
};

export type RoadmapWeek = readonly [index: string, title: string, output: string, phase: string];
export type Localized<T> = Record<Locale, T>;
