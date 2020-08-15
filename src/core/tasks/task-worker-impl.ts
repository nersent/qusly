import { TaskWorker } from '~/common/tasks/task-worker';
import { Strategy } from '~/common/strategies/strategy';
import { TaskGroup } from '../constants/task-group';

export class TaskWorkerImpl extends TaskWorker {
  constructor(public instance: Strategy, public group: TaskGroup) {
    super();
  }

  protected checkGroup(group: TaskGroup) {
    return (
      this.group === TaskGroup.All ||
      (!group && this.group === TaskGroup.Misc) ||
      this.group === group
    );
  }

  public async handle() {
    return this.task.fn(this.instance, this);
  }
}
