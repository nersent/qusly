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
}

export type ITasksGroupFilter = (worker: ITaskWorker, group: string) => boolean;

// export type ITasksInstanceGetter = <T>(index: number, group: string) => T;
