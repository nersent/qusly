import { Strategy } from '~/common/strategies/strategy';
import {
  ArgumentTypes,
  ExtractMethods,
  UnwrapPromise,
} from '~/common/interfaces';
import { TaskManager } from '~/common/tasks/task-manager';
import { Client } from 'basic-ftp';
import { FtpStrategy } from './ftp-strategy';

export class FtpInvokerFactory {
  public static create(instance: FtpStrategy) {
    return <T extends ExtractMethods<Client>>(fn: T, group?: number) => async (
      ...args: ArgumentTypes<Client[T]>
    ): Promise<UnwrapPromise<ReturnType<Client[T]>>> => {
      try {
        return await instance.client[fn as any](...args);
      } catch (err) {
        const message = err.message as string;

        if (
          message !== 'Client is closed' &&
          !message.startsWith('User closed client during task')
        ) {
          throw err;
        }
      }

      return null;
    };
  }
}
