import { describe, expect, it } from 'vitest';

import { InMemoryCheckpointStore } from './checkpoint';

describe('InMemoryCheckpointStore', () => {
  it('should_save_load_and_delete_checkpoints', async () => {
    const store = new InMemoryCheckpointStore();

    await expect(store.load('projection-a')).resolves.toBeNull();

    await store.save({ projectionName: 'projection-a', position: 10, updatedAt: 100 });
    await store.save({ projectionName: 'projection-b', position: 5, updatedAt: 90 });

    await expect(store.load('projection-a')).resolves.toEqual({
      projectionName: 'projection-a',
      position: 10,
      updatedAt: 100,
    });

    await store.save({ projectionName: 'projection-a', position: 20, updatedAt: 200 });
    await expect(store.load('projection-a')).resolves.toMatchObject({ position: 20 });

    await store.delete('projection-a');
    await expect(store.load('projection-a')).resolves.toBeNull();
    await expect(store.load('projection-b')).resolves.toMatchObject({ position: 5 });
  });
});
