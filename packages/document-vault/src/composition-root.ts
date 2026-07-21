import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { VaultRepository } from "./repository";
import { InMemoryVaultRepository } from "./in-memory-repository";
import { VaultService } from "./vault/service";
import { AccessControlService } from "./access-control/service";
import { VerificationService } from "./verification/service";
import { KYCIntakeService } from "./kyc-intake/service";

export class VaultModule {
  constructor(
    public readonly vaultService: VaultService,
    public readonly accessControl: AccessControlService,
    public readonly verification: VerificationService,
    public readonly kycIntake: KYCIntakeService,
    public readonly events: EventBus,
  ) {}
}

export interface VaultModuleOptions {
  repository?: VaultRepository;
  events: EventBus;
  logger?: Logger;
}

export function createVaultModule(options: VaultModuleOptions): VaultModule {
  const repository = options.repository ?? new InMemoryVaultRepository();
  const { events, logger } = options;

  const vaultService = new VaultService(repository, events, logger);
  const accessControl = new AccessControlService(repository, events, logger);
  const verification = new VerificationService(repository, events, logger);
  const kycIntake = new KYCIntakeService(repository, vaultService, verification, events, logger);

  return new VaultModule(vaultService, accessControl, verification, kycIntake, events);
}
