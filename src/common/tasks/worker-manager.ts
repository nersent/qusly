import { TaskWorker } from './task-worker';

export abstract class WorkerManager {
  public abstract check(group: number): boolean;

  public abstract getAvailable(group: number): TaskWorker;
}
