import { initInternalAuth } from "./auth";

let started = false;

export function assertStartupConfiguration(): void {
  if (started) return;
  started = true;
  initInternalAuth();
}
