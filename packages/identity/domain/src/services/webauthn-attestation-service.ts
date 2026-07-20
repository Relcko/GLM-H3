export interface AttestationObject {
  readonly fmt: string;
  readonly attStmt: Record<string, unknown>;
  readonly authData: string;
}

export interface WebAuthnAttestationResult {
  readonly credentialId: string;
  readonly publicKey: string;
  readonly aaguid: string;
  readonly attestationObject: AttestationObject;
  readonly clientDataJSON: string;
  readonly transports?: readonly string[];
}

export interface IWebAuthnAttestationService {
  verifyAttestation(
    result: WebAuthnAttestationResult,
    expectedChallenge: string,
    expectedRpId: string,
  ): Promise<{ verified: boolean; publicKey?: string; aaguid?: string }>;
}
