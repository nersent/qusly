const jsftp = require('jsftp');

import { IConfig } from "../interfaces";

export class Client {
  public config: IConfig;

  public connected = false;

  private client: any;

  public connect(config: IConfig) {
    this.config = { ...{
      protocol: 'ftp',
      port: 21,
      user: 'anonymous',
      password: '@anonymous'
    }, ...config };

    return new Promise((resolve, reject) => {
      this.client = new jsftp();

      this.client.connect(this.config);
      // TODO: Error handling
      this.client.on('connect', () => {
        resolve();
        this.connected = true;
      })
    });
  }

  public disconnect() {
    const { protocol } = this.config;

    if (protocol === 'ftp') {
      this.client.destroy();
    }

    this.connected = false;
  }
} 