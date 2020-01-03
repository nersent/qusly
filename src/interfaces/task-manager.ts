export type ITaskStatus = 'busy' | 'pending' | 'finished' | 'deleted';

export interface ITask {
  id?: string;
  cb?: Function;
  status?: ITaskStatus;
}

export interface ITaskResponse {
  data?: any;
  error?: Error;
}
