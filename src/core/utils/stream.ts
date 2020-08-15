import { Writable, Readable, Stream } from 'stream';
import { createWriteStream, createReadStream } from 'fs';

export const getPathFromStream = (
  stream: Readable | Writable,
): string | undefined => {
  return (stream as any)?.path;
};

export const useWriteStream = (dest: Writable | string, startAt?: number) => {
  let localPath: string;
  let stream: Writable;

  if (typeof dest === 'string') {
    stream = createWriteStream(dest, {
      flags: startAt ? 'a' : 'w',
      start: startAt,
    });

    localPath = dest;
  } else {
    stream = dest;
    localPath = getPathFromStream(dest);
  }

  return { stream, localPath };
};

export const useReadStream = (source: Readable | string) => {
  let stream: Readable;
  let localPath: string;

  if (typeof source === 'string') {
    stream = createReadStream(source);
    localPath = source;
  } else {
    stream = source;
    localPath = getPathFromStream(source);
  }

  return { stream, localPath };
};
