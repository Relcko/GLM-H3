export interface IClock {
  now(): Date;
  nowMs(): number;
}

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }

  nowMs(): number {
    return Date.now();
  }
}
