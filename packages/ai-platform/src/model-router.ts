import type { ModelAdapter, ModelCapability, ModelProvider, ModelRequest, ModelResponse } from "./types";
import { ModelRouterError } from "./errors";
import type { Logger } from "@relcko/logging";

export class ModelRouter {
  private readonly adapters = new Map<ModelProvider, ModelAdapter>();

  constructor(
    private readonly logger?: Logger,
  ) {}

  register(adapter: ModelAdapter): void {
    this.adapters.set(adapter.provider, adapter);
    this.logger?.info("model adapter registered", { provider: adapter.provider });
  }

  unregister(provider: ModelProvider): void {
    this.adapters.delete(provider);
    this.logger?.info("model adapter unregistered", { provider });
  }

  getAdapter(provider: ModelProvider): ModelAdapter | undefined {
    return this.adapters.get(provider);
  }

  listProviders(): readonly ModelProvider[] {
    return Array.from(this.adapters.keys());
  }

  listCapabilities(): readonly { provider: ModelProvider; capabilities: readonly ModelCapability[] }[] {
    return Array.from(this.adapters.entries()).map(([provider, adapter]) => ({
      provider,
      capabilities: adapter.capabilities,
    }));
  }

  async invoke(
    provider: ModelProvider,
    request: ModelRequest,
  ): Promise<ModelResponse> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new ModelRouterError(`No adapter registered for provider: ${provider}`);
    }
    if (!adapter.isAvailable()) {
      throw new ModelRouterError(`Provider ${provider} is not available`, { provider });
    }
    return adapter.invoke(request);
  }

  async invokeBest(
    request: ModelRequest,
    preferredProviders?: readonly ModelProvider[],
  ): Promise<{ provider: ModelProvider; response: ModelResponse }> {
    const candidates = preferredProviders?.length
      ? preferredProviders.map(p => this.adapters.get(p)).filter((a): a is ModelAdapter => a !== undefined)
      : Array.from(this.adapters.values());

    if (candidates.length === 0) {
      throw new ModelRouterError("No available model adapters");
    }

    for (const adapter of candidates) {
      if (!adapter.isAvailable()) continue;
      const supported = request.capabilities.every(c => adapter.capabilities.includes(c));
      if (!supported) continue;
      try {
        const response = await adapter.invoke(request);
        return { provider: adapter.provider, response };
      } catch (error) {
        this.logger?.warn("model invocation failed, trying next", {
          provider: adapter.provider,
          error: String(error),
        });
      }
    }

    throw new ModelRouterError("All model providers failed");
  }
}
