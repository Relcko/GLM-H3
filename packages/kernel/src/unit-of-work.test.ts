import { describe, expect, it } from 'vitest';

import type { UnitOfWork } from './unit-of-work';

class FakeUnitOfWork implements UnitOfWork {
  private active = false;
  readonly calls: string[] = [];

  get isActive(): boolean {
    return this.active;
  }

  begin(): Promise<void> {
    this.active = true;
    this.calls.push('begin');
    return Promise.resolve();
  }

  commit(): Promise<void> {
    this.active = false;
    this.calls.push('commit');
    return Promise.resolve();
  }

  rollback(): Promise<void> {
    this.active = false;
    this.calls.push('rollback');
    return Promise.resolve();
  }

  async execute<T>(work: () => Promise<T>): Promise<T> {
    await this.begin();
    try {
      const result = await work();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

describe('UnitOfWork', () => {
  it('execute_should_commit_when_work_succeeds', async () => {
    const uow = new FakeUnitOfWork();
    const result = await uow.execute(() => Promise.resolve(42));

    expect(result).toBe(42);
    expect(uow.calls).toEqual(['begin', 'commit']);
    expect(uow.isActive).toBe(false);
  });

  it('execute_should_rollback_and_rethrow_when_work_fails', async () => {
    const uow = new FakeUnitOfWork();
    const failure = new Error('boom');

    await expect(
      uow.execute(() => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(uow.calls).toEqual(['begin', 'rollback']);
    expect(uow.isActive).toBe(false);
  });
});
