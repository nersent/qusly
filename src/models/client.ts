import { EventEmitter } from 'events';

export declare interface Client {
  on(event: 'connect', listener: Function): this;
  on(event: 'disconnect', listener: Function): this;
  on(event: 'abort', listener: Function): this;
}

export class Client extends EventEmitter {

};
