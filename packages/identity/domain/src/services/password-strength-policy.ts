export interface PasswordStrengthResult {
  readonly valid: boolean;
  readonly score: number;
  readonly errors: readonly string[];
  readonly suggestions: readonly string[];
}

export interface IPasswordStrengthPolicy {
  evaluate(password: string): PasswordStrengthResult;
  getMinimumScore(): number;
}
