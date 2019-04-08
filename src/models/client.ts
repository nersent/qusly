const jsftp = require('jsftp');

import { IConfig } from "../interfaces";

export class Client {
  public config: IConfig;

  public connect(config: IConfig) {
    this.config = config;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }
} 