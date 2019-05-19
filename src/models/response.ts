export interface IRes {
  success: boolean;
  error?: Error;
}

export interface ISizeRes extends IRes {
  size?: number;
}
