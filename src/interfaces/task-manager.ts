export type ITaskStatus = 'busy' | 'pending' | 'finished' | 'deleted';

export type ITaskCallback = (taskId: string, taskIndex: number) => void;

export interface ITask {
  id?: string;
  cb?: ITaskCallback;
  status?: ITaskStatus;
  data?: any;
}

export interface ITaskResponse {
  data?: any;
  error?: Error;
}

export type ITaskFilter = (task: ITask) => boolean;
