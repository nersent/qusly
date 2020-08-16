export class NetworkUtils {
  public static getSpeed(elapsed: number, bytes: number) {
    if (!elapsed || bytes == null) return 0;
    return Math.round(bytes / elapsed);
  }

  public static getEta(elapsed: number, speed: number, totalBytes: number) {
    if (!speed || totalBytes == null) return null;

    const rate = totalBytes / speed;

    return Math.round(rate - elapsed);
  }

  public static getPercent(bytes: number, totalBytes: number) {
    return Math.round((bytes / totalBytes) * 100);
  }
}
