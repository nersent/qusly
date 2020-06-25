import { ITransferInfo, ITransferProgress } from './interfaces';

export class Transfer {
  public startTime: number;

  constructor(
    public info: ITransferInfo,
    public onProgress: (e: ITransferProgress) => void,
  ) {
    this.startTime = new Date().getTime();
  }

  public get elapsed() {
    return (new Date().getTime() - this.startTime) / 1000;
  }

  public get speed() {
    return this.info.bytes / this.elapsed;
  }

  public get eta() {
    const rate = this.info.totalBytes / this.speed;
    const eta = Math.round(rate - this.elapsed);

    return Number.isSafeInteger(eta) ? eta : 0;
  }

  public get percent() {
    return Math.round((this.info.bytes / this.info.totalBytes) * 100);
  }

  public handleProgress = (bytes: number) => {
    this.info.bytes = bytes;

    if (!this.info.quiet) {
      this.onProgress({
        bytes: this.info.bytes,
        totalBytes: this.info.totalBytes,
        remotePath: this.info.remotePath,
        eta: this.eta,
        percent: this.percent,
        speed: this.speed,
      });
    }
  };
}
