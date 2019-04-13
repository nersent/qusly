export interface IConnectRes {
  success: boolean;
  error?: {
    code: string | number;
    message: string;
  }
}