import { ValidationFailedError } from '../errors/application-error';

export interface Validator<T> {
  validate(payload: T): Promise<readonly string[]> | readonly string[];
}

export interface ValidationPipeline {
  execute<T>(payload: T, validators: readonly Validator<T>[]): Promise<void>;
}

export class DefaultValidationPipeline implements ValidationPipeline {
  async execute<T>(payload: T, validators: readonly Validator<T>[]): Promise<void> {
    const results = await Promise.all(
      validators.map((v) => {
        const result = v.validate(payload);
        return result instanceof Promise ? result : Promise.resolve(result);
      }),
    );
    const errors = results.flat();
    if (errors.length > 0) {
      throw new ValidationFailedError(errors);
    }
  }
}
