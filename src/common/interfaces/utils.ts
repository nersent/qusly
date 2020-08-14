export type ArgumentTypes<F extends Function> = F extends (
  ...args: infer A
) => any
  ? A
  : never;

export type ExtractMethods<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
