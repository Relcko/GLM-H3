export interface ITotpService {
  generateSecret(): string;
  generateCode(secret: string, timestamp?: number): string;
  verifyCode(secret: string, code: string, tolerance?: number): boolean;
  getPeriod(): number;
}
