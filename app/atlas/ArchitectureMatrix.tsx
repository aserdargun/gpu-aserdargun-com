import type { Locale } from "../i18n";
import { uiByLocale } from "./copy";
import type { ArchitectureId, Maturity } from "./types";

type ArchitectureEntry = {
  id: ArchitectureId;
  name: string;
  capability: string;
  support: string;
  maturity: Maturity;
};

export const architectureMeta = {
  ada: { id: "ada", name: "Ada", capability: "SM89", support: "core baseline", maturity: "core" },
  hopper: { id: "hopper", name: "Hopper", capability: "SM90", support: "current", maturity: "current" },
  blackwell: { id: "blackwell", name: "Blackwell", capability: "SM100 · SM120", support: "current", maturity: "current" },
  rubin: { id: "rubin", name: "Rubin", capability: "SM107", support: "preview", maturity: "preview" },
} as const satisfies Record<ArchitectureId, ArchitectureEntry>;

const architectureOrder: readonly ArchitectureId[] = ["ada", "hopper", "blackwell", "rubin"];

export type ArchitectureMatrixProps = {
  locale: Locale;
};

export function ArchitectureMatrix({ locale }: ArchitectureMatrixProps) {
  const copy = uiByLocale[locale];

  return (
    <section className="architecture-matrix section-block" data-testid="atlas-architecture-matrix" aria-labelledby="architecture-matrix-title">
      <div className="section-heading">
        <div>
          <span>{copy.architectureMatrix}</span>
          <h2 id="architecture-matrix-title">{copy.architectureTitleA}<br /><em>{copy.architectureTitleB}</em></h2>
        </div>
        <p>{copy.architectureNote}</p>
      </div>
      <div className="architecture-grid">
        {architectureOrder.map((id) => {
          const architecture = architectureMeta[id];
          return (
            <article
              className={`architecture-card ${architecture.maturity}`}
              data-testid={`atlas-architecture-${architecture.id}`}
              data-maturity={architecture.maturity}
              key={architecture.id}
            >
              <div>
                <span className={`freshness-badge ${architecture.maturity}`}>{copy.maturityLabels[architecture.maturity]}</span>
                <code>{`${architecture.capability} / ${architecture.support}`}</code>
              </div>
              <h3>{architecture.name}</h3>
              <p>{copy.architectureDescriptions[architecture.id]}</p>
              {architecture.maturity === "preview" ? <small>{copy.previewCaveat}</small> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
