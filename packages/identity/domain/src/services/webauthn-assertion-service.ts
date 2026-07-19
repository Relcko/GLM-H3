export interface WebAuthnAssertionRequest {
  readonly challenge: string;
  readonly rpId: string;
  readonly allowCredentials?: readonly { id: string; transports?: readonly string[] }[];
  readonly userVerification?: 'required' | 'preferred' | 'discouraged';
}

export interface WebAuthnAssertionResult {
  readonly credentialId: string;
  readonly authenticatorData: string;
  readonly clientDataJSON: string;
  readonly signature: string;
  readonly userHandle?: string;
}

export interface IWebAuthnAssertionService {
  verifyAssertion(
    request: WebAuthnAssertionRequest,
    result: WebAuthnAssertionResult,
    publicKey: string,
  ): Promise<boolean>;
}
