import { ValidationError } from '@relcko/errors';
import { ValueObject } from '@relcko/kernel';

export type PolicyOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'and'
  | 'or'
  | 'not';

export interface PolicyCondition {
  readonly operator: PolicyOperator;
  readonly field: string;
  readonly value: unknown;
}

export interface PolicyExpressionValues {
  readonly conditions: PolicyCondition[];
  readonly operator?: 'and' | 'or';
}

export class PolicyExpression extends ValueObject {
  public readonly conditions: readonly PolicyCondition[];
  public readonly operator: 'and' | 'or';

  constructor(values: PolicyExpressionValues) {
    super();
    if (values.conditions.length === 0) {
      throw new ValidationError('PolicyExpression must have at least one condition');
    }
    for (const condition of values.conditions) {
      if (condition.operator.length === 0)
        throw new ValidationError('PolicyExpression condition operator is required');
      if (condition.field.length === 0)
        throw new ValidationError('PolicyExpression condition field is required');
    }
    this.conditions = Object.freeze([...values.conditions]);
    this.operator = values.operator ?? 'and';
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [JSON.stringify(this.conditions), this.operator];
  }

  toJSON(): PolicyExpressionValues {
    return {
      conditions: [...this.conditions],
      operator: this.operator,
    };
  }
}
