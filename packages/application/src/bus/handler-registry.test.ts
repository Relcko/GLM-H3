import { describe, expect, it } from 'vitest';

import { HandlerRegistry } from './handler-registry';
import { DuplicateHandlerError, UnknownCommandError, UnknownQueryError } from '../errors/application-error';

describe('HandlerRegistry', () => {
  it('registers and resolves a handler', () => {
    const registry = new HandlerRegistry<() => string>();
    const handler = () => 'done';
    registry.register('test-command', handler, 'command');
    expect(registry.resolve('test-command', 'command')).toBe(handler);
  });

  it('rejects duplicate registration for same kind', () => {
    const registry = new HandlerRegistry<() => void>();
    const a = () => { return; };
    const b = () => { return; };
    registry.register('dup', a, 'command');
    expect(() => { registry.register('dup', b, 'command'); }).toThrow(DuplicateHandlerError);
  });

  it('allows same name across command and query', () => {
    const registry = new HandlerRegistry<() => void>();
    const a = () => { return; };
    const b = () => { return; };
    registry.register('shared', a, 'command');
    registry.register('shared', b, 'query');
    expect(registry.has('shared', 'command')).toBe(true);
    expect(registry.has('shared', 'query')).toBe(true);
  });

  it('throws UnknownCommandError when resolving missing command', () => {
    const registry = new HandlerRegistry<() => void>();
    expect(() => registry.resolve('missing', 'command')).toThrow(UnknownCommandError);
  });

  it('throws UnknownQueryError when resolving missing query', () => {
    const registry = new HandlerRegistry<() => void>();
    expect(() => registry.resolve('missing', 'query')).toThrow(UnknownQueryError);
  });

  it('checks existence with has', () => {
    const registry = new HandlerRegistry<() => void>();
    const h = () => { return; };
    registry.register('exists', h, 'command');
    expect(registry.has('exists', 'command')).toBe(true);
    expect(registry.has('nope', 'command')).toBe(false);
  });

  it('returns all entries', () => {
    const registry = new HandlerRegistry<() => void>();
    const a = () => { return; };
    const b = () => { return; };
    registry.register('cmd-a', a, 'command');
    registry.register('qry-b', b, 'query');
    const entries = registry.entries();
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.messageType === 'cmd-a')?.handler).toBe(a);
  });

  it('clears all handlers', () => {
    const registry = new HandlerRegistry<() => void>();
    const h = () => { return; };
    registry.register('a', h, 'command');
    registry.register('b', h, 'query');
    registry.clear();
    expect(registry.size).toBe(0);
  });

  it('tracks size', () => {
    const registry = new HandlerRegistry<() => void>();
    const h = () => { return; };
    expect(registry.size).toBe(0);
    registry.register('a', h, 'command');
    expect(registry.size).toBe(1);
    registry.register('b', h, 'query');
    expect(registry.size).toBe(2);
  });
});
