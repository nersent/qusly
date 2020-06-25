export interface IOptions {
  pool?: number;
  transferPool?: boolean;
}

export interface IStrategiesMap {
  [key: string]: any;
}

export type IClientWorkerGroup = 'all' | 'misc' | 'transfer';
