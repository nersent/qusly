import { Strategy } from '~/strategies/strategy';
import { throws } from 'assert';

export class StrategyManager {
  private map = new Map<string, typeof Strategy>();

  public register(protocol: string, provider: any) {
    if (!protocol) throw new Error(`Protocol ${protocol} is not provided`);
    if (!provider) throw new Error('Strategy is not provided');
    if (this.map.has(protocol))
      throw new Error(`Protocol ${protocol} is already registered`);

    this.map.set(protocol, provider);

    return this;
  }

  public unregister(protocol: string) {
    if (!this.map.has(protocol))
      throw new Error(`Protocol ${protocol} not found`);

    this.map.delete(protocol);

    return this;
  }

  public get(protocol: string) {
    const strategy = this.map.get(protocol);

    if (!strategy)
      throw new Error(`Strategy for protocol ${protocol} not found`);

    return strategy;
  }
}
