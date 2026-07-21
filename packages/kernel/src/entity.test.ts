import { describe, expect, it } from 'vitest';

import { Entity } from './entity';

class UserEntity extends Entity<string> {
  readonly kind = 'user';
}

class OrderEntity extends Entity<string> {
  readonly kind = 'order';
}

describe('Entity', () => {
  it('exposes the identifier passed to the constructor', () => {
    const entity = new UserEntity('user-1');
    expect(entity.id).toBe('user-1');
  });

  it('equals_should_return_true_when_type_and_id_match', () => {
    expect(new UserEntity('user-1').equals(new UserEntity('user-1'))).toBe(true);
  });

  it('equals_should_return_false_when_ids_differ', () => {
    expect(new UserEntity('user-1').equals(new UserEntity('user-2'))).toBe(false);
  });

  it('equals_should_return_false_when_types_differ', () => {
    expect(new UserEntity('shared-id').equals(new OrderEntity('shared-id'))).toBe(false);
  });

  it('equals_should_return_false_when_other_is_null_or_undefined', () => {
    const entity = new UserEntity('user-1');
    expect(entity.equals(null)).toBe(false);
    expect(entity.equals(undefined)).toBe(false);
  });
});
