import { ITransferInfo, IProgressEvent, ITransferOptions } from './interfaces';

export class Transfer {
  public startTime: number;

  protected bytes: number;

  constructor(
    public info: ITransferInfo,
    public options: ITransferOptions,
    public onProgress: (e: IProgressEvent) => void,
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

    if (!this.options?.quiet) {
      this.onProgress({
        ...this.info,
        id: this.options?.id,
        bytes: this.bytes,
        eta: this.eta,
        percent: this.percent,
        speed: this.speed,
      });
    }
  };
}
