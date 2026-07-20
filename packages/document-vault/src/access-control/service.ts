import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { VaultRepository } from "../repository";
import type { AccessGrant, AuthorizedDownloadToken } from "../types";
import { AccessGrantScope } from "../types";
import { createAccessGrant, assertAccessGrantInvariants } from "../domain";
import { VaultEventType, publishVaultEvent } from "../events";

export class AccessControlService {
  constructor(
    private readonly repository: VaultRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  grantAccess(actorId: EntityId, input: {
    documentId: EntityId;
    granteeId: EntityId;
    grantorId: EntityId;
    scope: AccessGrantScope;
    reason: string;
    expiresAt?: string;
  }): AccessGrant {
    const grant = createAccessGrant({
      id: generateId("vault-grant"),
      documentId: input.documentId as string,
      granteeId: input.granteeId as string,
      grantorId: input.grantorId as string,
      scope: input.scope,
      reason: input.reason,
      expiresAt: input.expiresAt,
    });

    assertAccessGrantInvariants(grant);
    this.repository.saveAccessGrant(grant);

    publishVaultEvent(this.events, VaultEventType.AccessGranted, grant.id, actorId, {
      grantId: grant.id as string,
      documentId: input.documentId as string,
      granteeId: input.granteeId as string,
      scope: input.scope,
    });

    this.logger?.info("access grant created", { grantId: grant.id, documentId: input.documentId });
    return grant;
  }

  revokeAccess(actorId: EntityId, grantId: EntityId): void {
    this.repository.revokeAccessGrant(grantId);

    publishVaultEvent(this.events, VaultEventType.AccessRevoked, grantId, actorId, {
      grantId: grantId as string,
    });
  }

  canAccess(granteeId: EntityId, documentId: EntityId, scope: AccessGrantScope): boolean {
    const doc = this.repository.getDocument(documentId);
    if (!doc) return false;
    if (doc.isPublic && scope === AccessGrantScope.Read) return true;
    return this.repository.isAccessGranted(granteeId, documentId, scope);
  }

  generateAuthorizedDownloadToken(
    actorId: EntityId,
    documentId: EntityId,
    granteeId: EntityId,
    durationMs: number = 3600000,
  ): AuthorizedDownloadToken | undefined {
    if (!this.canAccess(granteeId, documentId, AccessGrantScope.Download)) {
      this.logger?.warn("unauthorized download attempt", { documentId, granteeId });
      return undefined;
    }

    const doc = this.repository.getDocument(documentId);
    if (!doc) return undefined;

    const token = generateId("vault-token");
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    const downloadToken: AuthorizedDownloadToken = {
      token,
      documentId,
      granteeId,
      scope: AccessGrantScope.Download,
      expiresAt,
      url: `/api/vault/documents/${documentId}/download?token=${token}`,
    };

    publishVaultEvent(this.events, VaultEventType.DocumentAccessed, documentId, actorId, {
      documentId: documentId as string,
      granteeId: granteeId as string,
      scope: AccessGrantScope.Download,
      token: downloadToken.token.slice(0, 8),
    });

    return downloadToken;
  }

  verifyAuthorizedDownloadToken(token: string, documentId: EntityId, granteeId: EntityId): boolean {
    return this.canAccess(granteeId, documentId, AccessGrantScope.Download);
  }

  listGrantsByGrantee(granteeId: EntityId): AccessGrant[] {
    return this.repository.listAccessGrantsByGrantee(granteeId);
  }
}
