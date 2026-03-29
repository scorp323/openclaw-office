export function startOnboardingTour(): void {
  localStorage.removeItem("mc_tour_completed");
  window.dispatchEvent(new CustomEvent("mc:start-tour"));
}

export function isTourCompleted(): boolean {
  return localStorage.getItem("mc_tour_completed") === "true";
}

export function markTourCompleted(): void {
  localStorage.setItem("mc_tour_completed", "true");
}
