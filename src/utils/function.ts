import { ITaskResponse } from '~/interfaces/task';

export const execFunction = async (
  f: Function,
  ...args: any
): Promise<ITaskResponse> => {
  let data: any;
  let error: Error;

  try {
    data = await f(...args);
  } catch (err) {
    error = err;
  }

  return { data, error };
};
