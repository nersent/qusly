import { IResponse } from "../models";

export const getResponseData = (err?: Error, additional?: any): IResponse => {
  if (err != null) {
    return {
      success: false,
      error: {
        message: err.message,
        code: (err as any).code,
      } 
    };
  } 
  return { success: true, ...additional };
}