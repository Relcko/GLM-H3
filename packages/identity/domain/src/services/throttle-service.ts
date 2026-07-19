export interface IThrottleService {
  isThrottled(namespace: string, key: string): Promise<boolean>;
  increment(namespace: string, key: string, ttlMs?: number): Promise<number>;
  reset(namespace: string, key: string): Promise<void>;
  getRemainingAttempts(namespace: string, key: string): Promise<number>;
}
