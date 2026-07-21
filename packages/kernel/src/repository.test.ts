import { NotFoundError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { AggregateRoot } from './aggregate-root';
import { requireAggregate } from './repository';

import type { DomainEvent } from './domain-event';
import type { IReadRepository, IRepository } from './repository';

class StubAggregate extends AggregateRoot<string> {
  readonly aggregateType = 'StubAggregate';

  protected when(_event: DomainEvent): void {}
}

class InMemoryStubRepository implements IRepository<StubAggregate, string> {
  private readonly store = new Map<string, StubAggregate>();

  findById(id: string): Promise<StubAggregate | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  getById(id: string): Promise<StubAggregate> {
    return this.findById(id).then((aggregate) => requireAggregate('StubAggregate', id, aggregate));
  }

  save(aggregate: StubAggregate): Promise<void> {
    this.store.set(aggregate.id, aggregate);
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.store.delete(id);
    return Promise.resolve();
  }
}

describe('IRepository', () => {
  it('findById_should_return_null_when_aggregate_is_missing', async () => {
    const repository = new InMemoryStubRepository();
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('getById_should_throw_NotFoundError_when_aggregate_is_missing', async () => {
    const repository = new InMemoryStubRepository();
    await expect(repository.getById('missing')).rejects.toThrow(NotFoundError);
  });

  it('save_should_make_the_aggregate_findable', async () => {
    const repository = new InMemoryStubRepository();
    await repository.save(new StubAggregate('stub-1'));

    await expect(repository.findById('stub-1')).resolves.toBeInstanceOf(StubAggregate);
    await expect(repository.getById('stub-1')).resolves.toBeInstanceOf(StubAggregate);
  });

  it('delete_should_remove_the_aggregate', async () => {
    const repository = new InMemoryStubRepository();
    await repository.save(new StubAggregate('stub-1'));
    await repository.delete('stub-1');

    await expect(repository.findById('stub-1')).resolves.toBeNull();
  });
});

describe('requireAggregate', () => {
  it('should_return_the_aggregate_when_present', () => {
    const aggregate = new StubAggregate('stub-1');
    expect(requireAggregate('StubAggregate', 'stub-1', aggregate)).toBe(aggregate);
  });

  it('should_throw_NotFoundError_with_type_and_id_when_absent', () => {
    expect(() => requireAggregate('StubAggregate', 'stub-9', null)).toThrow(NotFoundError);
    expect(() => requireAggregate('StubAggregate', 'stub-9', null)).toThrow(
      'StubAggregate with id stub-9 not found',
    );
  });
});

describe('IReadRepository', () => {
  it('should_support_find_and_exists_contracts', async () => {
    interface StubReadModel {
      readonly id: string;
    }

    class InMemoryReadRepository implements IReadRepository<StubReadModel, string> {
      private readonly store = new Map<string, StubReadModel>();

      seed(model: StubReadModel): void {
        this.store.set(model.id, model);
      }

      findById(id: string): Promise<StubReadModel | null> {
        return Promise.resolve(this.store.get(id) ?? null);
      }

      exists(id: string): Promise<boolean> {
        return Promise.resolve(this.store.has(id));
      }
    }

    const repository = new InMemoryReadRepository();
    repository.seed({ id: 'rm-1' });

    await expect(repository.findById('rm-1')).resolves.toEqual({ id: 'rm-1' });
    await expect(repository.findById('rm-2')).resolves.toBeNull();
    await expect(repository.exists('rm-1')).resolves.toBe(true);
    await expect(repository.exists('rm-2')).resolves.toBe(false);
  });
});
