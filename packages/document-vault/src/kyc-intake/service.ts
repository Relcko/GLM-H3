import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { KycStatus } from "@relcko/domain-core";
import type { VaultRepository } from "../repository";
import { VaultDocumentCategory, VaultDocumentStatus } from "../types";
import type { VaultService } from "../vault/service";
import type { VerificationService } from "../verification/service";
import { VaultEventType, publishVaultEvent } from "../events";

export interface KYCIntakeInput {
  readonly investorId: EntityId;
  readonly documentFront: {
    readonly filename: string;
    readonly mimeType: string;
    readonly url: string;
    readonly size: number;
    readonly hash: string;
  };
  readonly documentBack?: {
    readonly filename: string;
    readonly mimeType: string;
    readonly url: string;
    readonly size: number;
    readonly hash: string;
  };
  readonly selfie?: {
    readonly filename: string;
    readonly mimeType: string;
    readonly url: string;
    readonly size: number;
    readonly hash: string;
  };
}

export interface KYCIntakeResult {
  readonly kycId: EntityId;
  readonly documentRefs: readonly EntityId[];
  readonly status: KycStatus;
  readonly submittedAt: string;
}

export class KYCIntakeService {
  constructor(
    private readonly repository: VaultRepository,
    private readonly vaultService: VaultService,
    private readonly verificationService: VerificationService,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async submit(actorId: EntityId, input: KYCIntakeInput): Promise<KYCIntakeResult> {
    const kycId = generateId("kyc") as EntityId;
    const documentRefs: EntityId[] = [];

    const frontDoc = this.vaultService.upload(actorId, {
      ownerId: input.investorId,
      uploaderId: input.investorId,
      category: VaultDocumentCategory.Kyc,
      filename: input.documentFront.filename,
      mimeType: input.documentFront.mimeType,
      url: input.documentFront.url,
      size: input.documentFront.size,
      isPublic: false,
      hash: input.documentFront.hash,
    });
    documentRefs.push(frontDoc.id);

    if (input.documentBack) {
      const backDoc = this.vaultService.upload(actorId, {
        ownerId: input.investorId,
        uploaderId: input.investorId,
        category: VaultDocumentCategory.Kyc,
        filename: input.documentBack.filename,
        mimeType: input.documentBack.mimeType,
        url: input.documentBack.url,
        size: input.documentBack.size,
        isPublic: false,
        hash: input.documentBack.hash,
      });
      documentRefs.push(backDoc.id);
    }

    if (input.selfie) {
      const selfieDoc = this.vaultService.upload(actorId, {
        ownerId: input.investorId,
        uploaderId: input.investorId,
        category: VaultDocumentCategory.Kyc,
        filename: input.selfie.filename,
        mimeType: input.selfie.mimeType,
        url: input.selfie.url,
        size: input.selfie.size,
        isPublic: false,
        hash: input.selfie.hash,
      });
      documentRefs.push(selfieDoc.id);
    }

    await publishVaultEvent(this.events, VaultEventType.KYCSubmitted, kycId, actorId, {
      kycId: kycId as string,
      investorId: input.investorId as string,
      documentRefs: documentRefs.map(d => d as string),
    });

    this.logger?.info("KYC submission received", {
      kycId,
      investorId: input.investorId,
      documentCount: documentRefs.length,
    });

    return {
      kycId,
      documentRefs,
      status: KycStatus.Submitted,
      submittedAt: new Date().toISOString(),
    };
  }

  approve(actorId: EntityId, kycId: EntityId, verifierId: EntityId, documentIds: EntityId[]): void {
    for (const docId of documentIds) {
      this.verificationService.verify(actorId, docId, verifierId);
    }

    publishVaultEvent(this.events, VaultEventType.KYCApproved, kycId, actorId, {
      kycId: kycId as string,
      verifierId: verifierId as string,
      documentRefs: documentIds.map(d => d as string),
    });

    this.logger?.info("KYC approved", { kycId, verifierId, documentCount: documentIds.length });
  }

  reject(actorId: EntityId, kycId: EntityId, verifierId: EntityId, documentIds: EntityId[], reason: string): void {
    for (const docId of documentIds) {
      this.verificationService.reject(actorId, docId, verifierId, `${reason} (document ${docId})`);
    }

    publishVaultEvent(this.events, VaultEventType.KYCRejected, kycId, actorId, {
      kycId: kycId as string,
      verifierId: verifierId as string,
      reason,
      documentRefs: documentIds.map(d => d as string),
    });

    this.logger?.info("KYC rejected", { kycId, verifierId, reason });
  }

  getKycDocuments(investorId: EntityId): EntityId[] {
    const docs = this.vaultService.listByCategory(investorId, VaultDocumentCategory.Kyc);
    return docs.map(d => d.id);
  }
}
