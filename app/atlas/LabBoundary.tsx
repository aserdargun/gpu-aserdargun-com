import { Component, type ReactNode } from "react";
import type { Locale } from "../i18n";

type Props = { children: ReactNode; locale: Locale; onRecover: () => void };

export class LabBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const tr = this.props.locale === "tr";
    return (
      <section className="module-unavailable" role="alert">
        <h1>{tr ? "Laboratuvar açılamadı" : "Laboratory unavailable"}</h1>
        <p>{tr ? "Bağlantını kontrol ederek yeniden yükleyebilir veya atlas haritasına dönebilirsin." : "Check your connection and reload, or return to the atlas map."}</p>
        <button onClick={() => window.location.reload()}>{tr ? "Yeniden yükle" : "Reload"}</button>{" "}
        <button onClick={this.props.onRecover}>{tr ? "Atlas haritasına dön" : "Return to atlas map"}</button>
      </section>
    );
  }
}
