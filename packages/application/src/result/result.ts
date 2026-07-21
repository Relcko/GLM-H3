export abstract class Result<T, E> {
  abstract readonly success: boolean;

  abstract getOrThrow(): T;

  abstract getError(): E;

  abstract map<U>(fn: (value: T) => U): Result<U, E>;

  abstract flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;

  abstract mapError<F>(fn: (error: E) => F): Result<T, F>;

  isSuccess(): this is Success<T, E> {
    return this.success;
  }

  isFailure(): this is Failure<T, E> {
    return !this.success;
  }

  static ok<T, E = never>(value: T): Success<T, E> {
    return new Success(value);
  }

  static fail<T = never, E = Error>(error: E): Failure<T, E> {
    return new Failure(error);
  }

  static combine<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const r of results) {
      if (r.isFailure()) {
        return r as unknown as Failure<T[], E>;
      }
      values.push(r.getOrThrow());
    }
    return Result.ok(values);
  }
}

export class Success<T, E> extends Result<T, E> {
  readonly success = true;

  constructor(private readonly _value: T) {
    super();
    Object.freeze(this);
  }

  getOrThrow(): T {
    return this._value;
  }

  getError(): E {
    throw new Error('Cannot get error from Success result');
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return Result.ok(fn(this._value));
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this._value);
  }

  mapError<F>(_fn: (error: E) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }
}

export class Failure<T, E> extends Result<T, E> {
  readonly success = false;

  constructor(private readonly _error: E) {
    super();
    Object.freeze(this);
  }

  getOrThrow(): T {
    throw this._error instanceof Error ? this._error : new Error(String(this._error));
  }

  getError(): E {
    return this._error;
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return Result.fail(this._error);
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return Result.fail(this._error);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return Result.fail(fn(this._error));
  }
}
