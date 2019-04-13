import { IProtocol } from "./protocol";

export interface IConfig {
  protocol?: IProtocol;
  host: string;
  port?: number;
  user?: string;
  password?: string;
}