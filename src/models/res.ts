export interface IResponse {
  success: boolean;
  error?: {
    code?: string | number;
    message?: string;
  }
}

export interface ISizeResponse extends IResponse {
  value?: number;
}