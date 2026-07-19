export interface ITokenGenerator {
  generateRandomToken(length?: number): string;
  generateNumericCode(length?: number): string;
  generateSecureId(): string;
}
