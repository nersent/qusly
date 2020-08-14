import { ITask } from '~/common/interfaces';

export abstract class TaskWorker {
  public busy = false;

  public paused = false;

  public group: number;

  public isAvailable(group: number) {
    return !this.busy && !this.paused && this.checkGroup(group);
  }

  protected abstract checkGroup(group: number);

  public async handle(task: ITask) {
    return task.fn();
  }
}
