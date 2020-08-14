export interface ITask {
  id: number;
  fn: Function;
  resolve: Function;
  reject: Function;
  group?: number;
}

export interface ITaskCreateOptions {
  id?: number;
  group?: number;
}
