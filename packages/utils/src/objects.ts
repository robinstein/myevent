export function getDifferingValues<T extends Record<string, unknown>>(
  source: T,
  target: Partial<T>
): Partial<T> {
  return Object.entries(target).reduce<Partial<T>>((acc, [key, value]) => {
    const typedKey = key as keyof T;
    if (source[typedKey] !== value) {
      acc[typedKey] = value;
    }
    return acc;
  }, {});
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce(
    (result, key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
      return result;
    },
    {} as Pick<T, K>
  );
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}
