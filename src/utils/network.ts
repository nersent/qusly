export const calcElapsed = (start: number) => {
  return (new Date().getTime() - start) / 1000;
}

export const calcEta = (elapsed: number, buffered: number, size: number) => {
  const rate = buffered / elapsed;
  const estimated = size / rate;

  const eta = Math.round(estimated - elapsed);

  return Number.isSafeInteger(eta) ? eta : 1;
}
