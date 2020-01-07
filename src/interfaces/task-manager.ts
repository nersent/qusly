export type ITaskStatus = 'busy' | 'pending' | 'finished' | 'deleted';

export type ITaskCallback = (taskId: string, taskIndex: number, aborted?: boolean) => void;

export interface ITask {
  id?: string;
  cb?: Function;
  status?: ITaskStatus;
}

export interface ITaskResponse {
  data?: any;
  error?: Error;
}
