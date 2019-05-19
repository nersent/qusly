export interface IRes {
  success: boolean;
  error?: Error;
}

export interface ISizeRes extends IRes {
  size?: number;
}

export interface ISendRes extends IRes {
  message?: string;
}
