import { Strategy } from '~/common/strategies/strategy';
import {
  ArgumentTypes,
  ExtractMethods,
  UnwrapPromise,
} from '~/common/interfaces';
import { TaskManager } from '~/common/tasks/task-manager';

export class TaskFactory {
  public static create(taskManager: TaskManager) {
    return <T extends ExtractMethods<Strategy>>(
      fn: T,
      group?: number,
    ) => async (
      ...args: ArgumentTypes<Strategy[T]>
    ): Promise<UnwrapPromise<ReturnType<Strategy[T]>>> => {
      return taskManager.enqueue(
        (instance: Strategy) => instance[fn as any](...args),
        { group },
      );
    };
  }
}
