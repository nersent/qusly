import { Strategy } from '~/common/strategies/strategy';
import { ITransfer } from '~/common/interfaces';

export interface IClientOptions {
  /**
   * Number of clients that will used for the communication.
   *
   * The larger the pool you set, the less often the queue will be blocked.
   * However, for every server there is a limit.
   */
  pool?: number;
  /**
   * It locks `pool - 1` channels for file transfer only.
   *
   * This may be very useful, if you transfer files constantly but still want to use generic methods like `Client.list`.
   *
   * If set to `<= pool`, then it's disabled.
   */
  transferPool?: boolean;
}

export type IClientTransferHandler = (
  instance: Strategy,
  info: ITransfer,
) => Promise<void>;
