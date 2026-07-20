import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export interface HashParametersValues {
  readonly memory: number;
  readonly iterations: number;
  readonly parallelism: number;
  readonly saltLength: number;
  readonly keyLength: number;
}

export class HashParameters extends ValueObject {
  public readonly memory: number;
  public readonly iterations: number;
  public readonly parallelism: number;
  public readonly saltLength: number;
  public readonly keyLength: number;

  constructor(values: HashParametersValues) {
    super();
    if (values.memory < 1) {
      throw new ValidationError('HashParameters memory must be >= 1');
    }
    if (values.iterations < 1) {
      throw new ValidationError('HashParameters iterations must be >= 1');
    }
    if (values.parallelism < 1) {
      throw new ValidationError('HashParameters parallelism must be >= 1');
    }
    if (values.saltLength < 1) {
      throw new ValidationError('HashParameters saltLength must be >= 1');
    }
    if (values.keyLength < 1) {
      throw new ValidationError('HashParameters keyLength must be >= 1');
    }
    this.memory = values.memory;
    this.iterations = values.iterations;
    this.parallelism = values.parallelism;
    this.saltLength = values.saltLength;
    this.keyLength = values.keyLength;
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.memory, this.iterations, this.parallelism, this.saltLength, this.keyLength];
  }

  toJSON(): HashParametersValues {
    return {
      memory: this.memory,
      iterations: this.iterations,
      parallelism: this.parallelism,
      saltLength: this.saltLength,
      keyLength: this.keyLength,
    };
  }
}
