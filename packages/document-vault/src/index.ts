export type { VaultRepository } from "./repository";
export { InMemoryVaultRepository } from "./in-memory-repository";

export { VaultService } from "./vault/service";
export { AccessControlService } from "./access-control/service";
export { VerificationService } from "./verification/service";
export { KYCIntakeService } from "./kyc-intake/service";

export { VaultModule, createVaultModule } from "./composition-root";
export type { VaultModuleOptions } from "./composition-root";

export * from "./types";
export * from "./events";
export * from "./domain";
