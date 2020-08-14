import { TaskWorker } from '~/common/tasks/task-worker';
import { Strategy } from '~/strategies/strategy';
import { ITask } from '~/common/interfaces';
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

  public async handle(task: ITask) {
    return task.fn(this.instance);
  }
}
