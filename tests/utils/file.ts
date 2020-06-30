import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

import { config } from '../constants/config';

export const getTempFilePath = () => {
  if (!existsSync(config.tempFolder)) {
    mkdirSync(config.tempFolder);
  }

  const path = resolve(config.tempFolder, Date.now().toString());

  return path;
};
