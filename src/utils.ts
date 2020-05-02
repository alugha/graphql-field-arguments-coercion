/**
 * Equivalent of bluebird.each
 */
export const forEach = <T>(
  iterable: T[],
  promiseFn: (v: T) => Promise<unknown>
): Promise<unknown[]> => Promise.all(iterable.map(promiseFn));
