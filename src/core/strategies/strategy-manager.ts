import { Strategy } from '~/strategies/strategy';
import { FtpStrategy } from '~/strategies/ftp';

export class StrategyManager {
  private static _instance: StrategyManager;

  private map = new Map<string, typeof Strategy>();

  public static get instance() {
    if (!this._instance) {
      this._instance = new StrategyManager();
      this._instance.registerDefaultStrategies();
    }

    return this._instance;
  }

  private registerDefaultStrategies() {
    this.register('ftp', FtpStrategy);
    this.register('ftps', FtpStrategy);
  }

  public register(protocol: string, provider: any) {
    if (!protocol) throw new Error(`Protocol ${protocol} is not provided`);
    if (!provider) throw new Error('Strategy is not provided');
    if (this.map.has(protocol))
      throw new Error(`Protocol ${protocol} is already registered`);

    this.map.set(protocol, provider);
  }

  public unregister(protocol: string) {
    if (!this.map.has(protocol))
      throw new Error(`Protocol ${protocol} not found`);

    this.map.delete(protocol);
  }

  public get(protocol: string) {
    const strategy = this.map.get(protocol);

    if (!strategy)
      throw new Error(`Strategy for protocol ${protocol} not found`);

    return strategy;
  }
}
