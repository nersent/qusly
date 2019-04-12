const jsftp = require('jsftp');
import { Client as sshClient, SFTPWrapper, ExecOptions } from 'ssh2';
import { SFTPStream } from 'ssh2-streams';

import { IConfig, IFile } from "../interfaces";

export class Client {
  public config: IConfig;

  public connected = false;

  public client: any;

  public sshConnection: sshClient;

  // TODO: Error handling
  public connect(config: IConfig) {
    this.config = { ...{
      protocol: 'ftp',
      port: 21,
      username: 'anonymous',
      password: '@anonymous'
    }, ...config };

    // SFTP
    if (config.protocol === 'sftp') {
      return new Promise((resolve) => {
        this.sshConnection = new sshClient();

        this.sshConnection.once('ready', () => {
          this.sshConnection.sftp((err, sftp) => {
            if (err) throw err;
            this.client = sftp;
            this.connected = true;
            resolve();
          })
        });

        this.sshConnection.on('error', (err) => {
          console.log(err);
        })

        this.sshConnection.connect(this.config);
      });
    }

    // FTP
    return new Promise((resolve) => {
      this.client = new jsftp();

      this.client.once('connect', (err) => {
        if (err) throw err;
        this.connected = true;
        resolve();
      });

      this.client.connect(this.config);
    });
  }

  // TODO: Error handling
  public disconnect() {
    const { protocol } = this.config;
    if (protocol === 'sftp') {
      this.sshConnection.end();
      this.client.end();
    } else {
      this.client.destroy();
    }
  }

  public exec(command: string, sshOptions: ExecOptions = {}) {
    const { protocol } = this.config;

    // SFTP
    if (protocol === 'sftp') {
     return new Promise((resolve) => {
        this.sshConnection.exec(command, sshOptions, (err, stream) => {
          if (err) throw err;
          let data = "";
          let errorData = "";

          stream.on('data', (buffer) => {
            data += buffer;
          });

          stream.on('close', () => {
            resolve(data);
            stream.destroy();
          })

          stream.stderr.on('data', (buffer) => {
            errorData += buffer;
          })
          
          stream.stderr.on('close', () => {
            if (errorData.trim().length) {
              stream.destroy();
              throw new Error(errorData);
            }
          })
        });
      });
    }

    // FTP
    return new Promise((resolve) => {
      this.client.raw(command, (err, data) => {
        if (err) throw new Error(err);     
        resolve(data.text);
      })
    });
  }
} 