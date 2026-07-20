import { describe, expect, it } from 'vitest';

import { DuplicateHandlerError, HandlerNotFoundError } from './errors';
import { createQuery } from './message';
import { InProcessQueryBus } from './query-bus';

import type { Query } from './message';
import type { QueryHandler } from './query-bus';
import type { CorrelationId } from '@relcko/types';

interface GetOrderPayload {
  readonly orderId: string;
}

interface OrderReadModel {
  readonly id: string;
  readonly status: string;
}

type GetOrderQuery = Query<GetOrderPayload>;

class GetOrderQueryHandler implements QueryHandler<GetOrderQuery, OrderReadModel> {
  readonly queryType = 'GetOrder';

  handle(query: GetOrderQuery): Promise<OrderReadModel> {
    return Promise.resolve({ id: query.payload.orderId, status: 'approved' });
  }
}

const correlationId = (): CorrelationId => crypto.randomUUID() as CorrelationId;

describe('InProcessQueryBus', () => {
  it('dispatch_should_route_the_query_to_its_handler', async () => {
    const bus = new InProcessQueryBus();
    bus.register(new GetOrderQueryHandler());

    const result = await bus.dispatch<OrderReadModel>(
      createQuery('GetOrder', { orderId: 'o-1' }, correlationId()),
    );

    expect(result).toEqual({ id: 'o-1', status: 'approved' });
  });

  it('dispatch_should_throw_HandlerNotFoundError_for_unknown_queries', async () => {
    const bus = new InProcessQueryBus();

    await expect(
      bus.dispatch(createQuery('GetOrder', { orderId: 'o-1' }, correlationId())),
    ).rejects.toThrow(HandlerNotFoundError);
  });

  it('register_should_reject_duplicate_handlers', () => {
    const bus = new InProcessQueryBus();
    bus.register(new GetOrderQueryHandler());

    expect(() => {
      bus.register(new GetOrderQueryHandler());
    }).toThrow(DuplicateHandlerError);
  });

  it('hasHandler_should_reflect_registrations', () => {
    const bus = new InProcessQueryBus();

    expect(bus.hasHandler('GetOrder')).toBe(false);
    bus.register(new GetOrderQueryHandler());
    expect(bus.hasHandler('GetOrder')).toBe(true);
  });
});
