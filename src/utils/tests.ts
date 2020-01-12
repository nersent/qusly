type ITime = number | [number, number];

export const delay = (message: string, ms = 10) => () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(message);
    }, ms);
  });
}

export const getTime = (time?: ITime) => {
  if (!time) return process.hrtime();
  const end = process.hrtime(time as any);
  return Math.floor((end[0] * 1000) + (end[1] / 1000000));
}

export const checkTime = (start: ITime, end: ITime, delay: number, padding = 10) => {
  const _end = (end == null ? getTime(start) : end) as number;
  return Math.abs(_end - delay) <= padding;
}
