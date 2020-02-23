import { IOptions } from '../interfaces';

export const DEFAULT_OPTIONS: IOptions = {
  ftps: {
    secureOptions: {
      rejectUnauthorized: false,
    },
  },
};
