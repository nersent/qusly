import { IFunctionResponse } from '~/core/interfaces';

export const execFunction = async (
  f: Function,
  ...args: any
): Promise<IFunctionResponse> => {
  let data: any;
  let error: Error;

  try {
    data = await f(...args);
  } catch (err) {
    error = err;
  }

  return { data, error };
};
