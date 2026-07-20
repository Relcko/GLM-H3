import { describe, expect, it } from 'vitest';

import type {
  IPasswordHashingService,
  ITotpService,
  ISecretStore,
  IPermissionResolver,
  IPolicyEvaluator,
  IPolicyAttributeCollector,
  IThrottleService,
  ILockoutPolicy,
  IMfaPolicy,
  IAuditRecorder,
  ISessionTokenIssuer,
  ISiweMessageBuilder,
  ISiweSignatureVerifier,
  IWebAuthnAssertionService,
  IWebAuthnAttestationService,
  IWalletOwnershipResolver,
  IStepUpPolicy,
  IPasswordStrengthPolicy,
  ITokenGenerator,
  IEmailVerificationService,
} from '../services';

describe('Domain Service Ports', () => {
  it('IPasswordHashingService is a valid type', () => {
    const _s: IPasswordHashingService | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('ITotpService is a valid type', () => {
    const _s: ITotpService | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('ISecretStore is a valid type', () => {
    const _s: ISecretStore | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IPermissionResolver is a valid type', () => {
    const _s: IPermissionResolver | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IPolicyEvaluator is a valid type', () => {
    const _s: IPolicyEvaluator | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IPolicyAttributeCollector is a valid type', () => {
    const _s: IPolicyAttributeCollector | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IThrottleService is a valid type', () => {
    const _s: IThrottleService | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('ILockoutPolicy is a valid type', () => {
    const _s: ILockoutPolicy | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IMfaPolicy is a valid type', () => {
    const _s: IMfaPolicy | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IAuditRecorder is a valid type', () => {
    const _s: IAuditRecorder | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('ISessionTokenIssuer is a valid type', () => {
    const _s: ISessionTokenIssuer | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('ISiweMessageBuilder is a valid type', () => {
    const _s: ISiweMessageBuilder | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('ISiweSignatureVerifier is a valid type', () => {
    const _s: ISiweSignatureVerifier | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IWebAuthnAssertionService is a valid type', () => {
    const _s: IWebAuthnAssertionService | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IWebAuthnAttestationService is a valid type', () => {
    const _s: IWebAuthnAttestationService | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IWalletOwnershipResolver is a valid type', () => {
    const _s: IWalletOwnershipResolver | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IStepUpPolicy is a valid type', () => {
    const _s: IStepUpPolicy | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IPasswordStrengthPolicy is a valid type', () => {
    const _s: IPasswordStrengthPolicy | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('ITokenGenerator is a valid type', () => {
    const _s: ITokenGenerator | undefined = undefined;
    expect(_s).toBeUndefined();
  });

  it('IEmailVerificationService is a valid type', () => {
    const _s: IEmailVerificationService | undefined = undefined;
    expect(_s).toBeUndefined();
  });
});
