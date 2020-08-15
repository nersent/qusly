import {
  ITransferOptions,
  ITransferProgressListener,
  ITransferInfo,
} from '~/interfaces';

export class Transfer {
  public startTime: number;

  protected bytes: number;

  constructor(
    public info: ITransferInfo,
    public options: ITransferOptions,
    public onProgress: ITransferProgressListener,
  ) {
    this.startTime = Date.now();
    this.bytes = info?.startAt ?? 0;
  }

  public get elapsed() {
    return (Date.now() - this.startTime) / 1000;
  }

  public get speed() {
    const elapsed = this.elapsed;

    if (elapsed === 0) {
      return 0;
    }

    return Math.round(this.bytes / elapsed);
  }

  public get eta() {
    const speed = this.speed;

    if (speed === 0) {
      return null;
    }

    const rate = this.info.totalBytes / this.speed;

    return Math.round(rate - this.elapsed);
  }

  public get percent() {
    return Math.round((this.bytes / this.info.totalBytes) * 100);
  }

  public handleProgress = (bytes: number) => {
    this.bytes = bytes;

    const { id, localPath, remotePath, totalBytes } = this.info;

    if (!this.options?.quiet) {
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
