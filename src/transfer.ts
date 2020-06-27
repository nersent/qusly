import {
  ITransferOptions,
  ITransferRequestInfo,
  ITransferProgressEventListener,
} from './interfaces';

export class Transfer {
  public startTime: number;

  protected bytes: number;

  constructor(
    public info: ITransferRequestInfo,
    public options: ITransferOptions,
    public onProgress: ITransferProgressEventListener,
  ) {
    this.startTime = new Date().getTime();

    this.bytes = options?.startAt ?? 0;
  }

  public get elapsed() {
    return (new Date().getTime() - this.startTime) / 1000;
  }

  public get speed() {
    return this.bytes / this.elapsed;
  }

  public get eta() {
    const rate = this.info.totalBytes / this.speed;
    const eta = Math.round(rate - this.elapsed);

    return Number.isSafeInteger(eta) ? eta : 0;
  }

  public get percent() {
    return Math.round((this.bytes / this.info.totalBytes) * 100);
  }

  public handleProgress = (bytes: number) => {
    this.bytes = bytes;

    const { quiet, id } = this.options;
    const { localPath, remotePath, totalBytes } = this.info;

    if (!quiet) {
      this.onProgress(
        { id, localPath, remotePath },
        {
          bytes,
          totalBytes,
          speed: this.speed,
          eta: this.eta,
          percent: this.percent,
        },
      );
    }
  };
}
