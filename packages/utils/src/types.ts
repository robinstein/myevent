export type ToPascalCase<T> = {
  [K in keyof T as K extends string
    ? K extends `${infer F}_${infer R}`
      ? `${Capitalize<F>}${Capitalize<R>}`
      : Capitalize<K>
    : K]: T[K] extends number ? Date : T[K];
};

export type ToSnakeCase<T> = {
  [K in keyof T as K extends string ? ToSnakeCaseKey<K> : K]: T[K] extends Date
    ? number
    : T[K];
};

type ToSnakeCaseKey<S extends string> = S extends `${infer F}${infer R}`
  ? R extends Uncapitalize<R>
    ? `${Lowercase<F>}${ToSnakeCaseKey<R>}`
    : `${Lowercase<F>}_${ToSnakeCaseKey<R>}`
  : S;
