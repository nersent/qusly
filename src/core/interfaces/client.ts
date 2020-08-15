import { Strategy } from '~/strategies/strategy';
import { ITransfer } from '~/interfaces';

export type IClientTransferHandler = (
  instance: Strategy,
  info: ITransfer,
) => Promise<void>;
