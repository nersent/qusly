import { ITask } from '~/common/interfaces';

export class TaskWorker {
  private _busy = false;

  public paused = false;

  public group: number;

  private _task: ITask;

  public get busy() {
    return this._busy;
  }

  public get task() {
    return this._task;
  }

  public setTask(task: ITask) {
    this._busy = true;
    this._task = task;
  }

  public done() {
    this._busy = false;
    this._task = null;
  }

  public isAvailable(group: number) {
    return !this.busy && !this.paused && this.checkGroup(group);
  }

  protected checkGroup(group: number) {
    return true;
  }

  public async handle() {
    return this.task.fn();
  }
}
