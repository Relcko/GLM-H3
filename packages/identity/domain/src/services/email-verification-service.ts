import type { EmailAddress, UserId } from '../value-objects';

export interface IEmailVerificationService {
  sendVerificationEmail(userId: UserId, email: EmailAddress): Promise<void>;
  verifyEmail(userId: UserId, token: string): Promise<boolean>;
  isEmailVerified(userId: UserId): Promise<boolean>;
  resendVerification(userId: UserId): Promise<void>;
}
