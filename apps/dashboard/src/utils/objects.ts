function getDifferingValues<T extends Record<string, unknown>>(
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

export { getDifferingValues };
