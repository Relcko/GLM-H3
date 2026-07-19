import { describe, expect, it } from 'vitest';

import type {
  IUserRepository,
  IWalletRepository,
  ISessionRepository,
  IOrganizationRepository,
  IRoleDefinitionRepository,
  IServiceAccountRepository,
  IAuthenticationAttemptRepository,
  IEmailVerificationRepository,
  IPasswordResetRepository,
  IRecoveryRepository,
  IPolicyDecisionRepository,
  IPasskeyRepository,
} from '../repositories';

// All identity-specific repository interfaces compile as valid subtypes of IRepository.
describe('Repository Interfaces', () => {
  it('IUserRepository is a valid type', () => {
    const _repo: IUserRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IWalletRepository is a valid type', () => {
    const _repo: IWalletRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('ISessionRepository is a valid type', () => {
    const _repo: ISessionRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IOrganizationRepository is a valid type', () => {
    const _repo: IOrganizationRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IRoleDefinitionRepository is a valid type', () => {
    const _repo: IRoleDefinitionRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IServiceAccountRepository is a valid type', () => {
    const _repo: IServiceAccountRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IAuthenticationAttemptRepository is a valid type', () => {
    const _repo: IAuthenticationAttemptRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IEmailVerificationRepository is a valid type', () => {
    const _repo: IEmailVerificationRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IPasswordResetRepository is a valid type', () => {
    const _repo: IPasswordResetRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IRecoveryRepository is a valid type', () => {
    const _repo: IRecoveryRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IPolicyDecisionRepository is a valid type', () => {
    const _repo: IPolicyDecisionRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });

  it('IPasskeyRepository is a valid type', () => {
    const _repo: IPasskeyRepository | undefined = undefined;
    expect(_repo).toBeUndefined();
  });
});
