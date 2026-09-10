// Increment the affected contract when a learner-visible meaning changes.
export const CONTRACT_VERSIONS = Object.freeze({
  behavior: 2, // URL navigation, explicit progress, and isolated module state.
  experiment: 1,
  world: 1,
  simulation: 2, // Deterministic lane counts; no simulated GPU test pass.
  metric: 2, // Unmeasured latency/bandwidth remain unavailable.
  export: 1, // Integrity manifest for the static artifact.
});
