export interface ITaskResponse {
  data?: any;
  error?: Error;
}

export interface ITask {
  id?: number;
  fn?: Function;
  group?: string;
}

export type ITaskOperation = 'finished';

export interface ITaskChange {
  type: ITaskOperation;
  taskId: number;
  error?: Error;
  data?: any;
}

export interface ITaskWorker {
  group?: string;
  busy?: boolean;
  index?: number;
  paused?: boolean;
}

export type ITasksGroupFilter = (worker: ITaskWorker, group: string) => boolean;

export interface ITaskHandlerEvent<T> {
  instance: T;
  taskId: number;
  workerIndex: number;
}

export type ITaskHandler<T> = (e: ITaskHandlerEvent<T>) => any;
