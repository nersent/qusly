import { promises as fs } from 'fs';
import { Readable, Writable } from 'stream';

export const getFilePathFromStream = (stream: Readable | Writable): string => {
  return (stream as any).path;
};

export const getFileSizeFromStream = async (source: Readable) => {
  const path = getFilePathFromStream(source);
  if (!path) return -1;

  const { size } = await fs.stat(path);
  return size;
};
