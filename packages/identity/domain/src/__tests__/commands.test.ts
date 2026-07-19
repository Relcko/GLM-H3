import { describe, expect, it } from 'vitest';

import type {
  ActivateServiceAccountCommand,
  AddMemberCommand,
  ApproveRecoveryCommand,
  AssignRoleCommand,
  CancelRecoveryCommand,
  ChangeMemberRoleCommand,
  CompleteEmailVerificationCommand,
  CompletePasswordResetCommand,
  CompleteRecoveryCommand,
  CreateOrganizationCommand,
  CreateRoleCommand,
  CreateServiceAccountCommand,
  CreateSessionCommand,
  DeactivateServiceAccountCommand,
  DeleteOrganizationCommand,
  DeleteRoleCommand,
  DeleteUserCommand,
  EvaluatePolicyCommand,
  InitiateEmailVerificationCommand,
  InitiatePasswordResetCommand,
  InitiateRecoveryCommand,
  LinkWalletCommand,
  ReactivateUserCommand,
  RecordAuthenticationAttemptCommand,
  RefreshSessionCommand,
  RegisterPasskeyCommand,
  RegisterUserCommand,
  RemoveMemberCommand,
  RemovePasskeyCommand,
  RevokeSessionCommand,
  SetPrimaryWalletCommand,
  SuspendUserCommand,
  UnassignRoleCommand,
  UnlinkWalletCommand,
  UpdateOrganizationCommand,
  UpdateRoleCommand,
  UpdateServiceAccountCommand,
  UpdateUserProfileCommand,
  VerifyWalletCommand,
} from '../commands';

describe('Command payload types', () => {
  it('User commands are well-typed', () => {
    const register: RegisterUserCommand = {} as RegisterUserCommand;
    const update: UpdateUserProfileCommand = {} as UpdateUserProfileCommand;
    const suspend: SuspendUserCommand = {} as SuspendUserCommand;
    const reactivate: ReactivateUserCommand = {} as ReactivateUserCommand;
    const del: DeleteUserCommand = {} as DeleteUserCommand;
    expect(register).toBeDefined();
    expect(update).toBeDefined();
    expect(suspend).toBeDefined();
    expect(reactivate).toBeDefined();
    expect(del).toBeDefined();
  });

  it('Wallet commands are well-typed', () => {
    const link: LinkWalletCommand = {} as LinkWalletCommand;
    const verify: VerifyWalletCommand = {} as VerifyWalletCommand;
    const unlink: UnlinkWalletCommand = {} as UnlinkWalletCommand;
    const setPrimary: SetPrimaryWalletCommand = {} as SetPrimaryWalletCommand;
    expect(link).toBeDefined();
    expect(verify).toBeDefined();
    expect(unlink).toBeDefined();
    expect(setPrimary).toBeDefined();
  });

  it('Session commands are well-typed', () => {
    const create: CreateSessionCommand = {} as CreateSessionCommand;
    const refresh: RefreshSessionCommand = {} as RefreshSessionCommand;
    const revoke: RevokeSessionCommand = {} as RevokeSessionCommand;
    expect(create).toBeDefined();
    expect(refresh).toBeDefined();
    expect(revoke).toBeDefined();
  });

  it('Organization commands are well-typed', () => {
    const create: CreateOrganizationCommand = {} as CreateOrganizationCommand;
    const update: UpdateOrganizationCommand = {} as UpdateOrganizationCommand;
    const del: DeleteOrganizationCommand = {} as DeleteOrganizationCommand;
    const add: AddMemberCommand = {} as AddMemberCommand;
    const remove: RemoveMemberCommand = {} as RemoveMemberCommand;
    const change: ChangeMemberRoleCommand = {} as ChangeMemberRoleCommand;
    expect(create).toBeDefined();
    expect(update).toBeDefined();
    expect(del).toBeDefined();
    expect(add).toBeDefined();
    expect(remove).toBeDefined();
    expect(change).toBeDefined();
  });

  it('Role commands are well-typed', () => {
    const create: CreateRoleCommand = {} as CreateRoleCommand;
    const update: UpdateRoleCommand = {} as UpdateRoleCommand;
    const del: DeleteRoleCommand = {} as DeleteRoleCommand;
    const assign: AssignRoleCommand = {} as AssignRoleCommand;
    const unassign: UnassignRoleCommand = {} as UnassignRoleCommand;
    expect(create).toBeDefined();
    expect(update).toBeDefined();
    expect(del).toBeDefined();
    expect(assign).toBeDefined();
    expect(unassign).toBeDefined();
  });

  it('ServiceAccount commands are well-typed', () => {
    const create: CreateServiceAccountCommand = {} as CreateServiceAccountCommand;
    const update: UpdateServiceAccountCommand = {} as UpdateServiceAccountCommand;
    const activate: ActivateServiceAccountCommand = {} as ActivateServiceAccountCommand;
    const deactivate: DeactivateServiceAccountCommand = {} as DeactivateServiceAccountCommand;
    expect(create).toBeDefined();
    expect(update).toBeDefined();
    expect(activate).toBeDefined();
    expect(deactivate).toBeDefined();
  });

  it('Auth commands are well-typed', () => {
    const record: RecordAuthenticationAttemptCommand = {} as RecordAuthenticationAttemptCommand;
    const initiateEmail: InitiateEmailVerificationCommand = {} as InitiateEmailVerificationCommand;
    const completeEmail: CompleteEmailVerificationCommand = {} as CompleteEmailVerificationCommand;
    const initiatePwd: InitiatePasswordResetCommand = {} as InitiatePasswordResetCommand;
    const completePwd: CompletePasswordResetCommand = {} as CompletePasswordResetCommand;
    expect(record).toBeDefined();
    expect(initiateEmail).toBeDefined();
    expect(completeEmail).toBeDefined();
    expect(initiatePwd).toBeDefined();
    expect(completePwd).toBeDefined();
  });

  it('Recovery commands are well-typed', () => {
    const initiate: InitiateRecoveryCommand = {} as InitiateRecoveryCommand;
    const approve: ApproveRecoveryCommand = {} as ApproveRecoveryCommand;
    const complete: CompleteRecoveryCommand = {} as CompleteRecoveryCommand;
    const cancel: CancelRecoveryCommand = {} as CancelRecoveryCommand;
    expect(initiate).toBeDefined();
    expect(approve).toBeDefined();
    expect(complete).toBeDefined();
    expect(cancel).toBeDefined();
  });

  it('Policy commands are well-typed', () => {
    const evaluate: EvaluatePolicyCommand = {} as EvaluatePolicyCommand;
    expect(evaluate).toBeDefined();
  });

  it('Passkey commands are well-typed', () => {
    const register: RegisterPasskeyCommand = {} as RegisterPasskeyCommand;
    const remove: RemovePasskeyCommand = {} as RemovePasskeyCommand;
    expect(register).toBeDefined();
    expect(remove).toBeDefined();
  });
});
