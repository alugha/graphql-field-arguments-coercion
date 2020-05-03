import { Path } from './types';

/**
 * Equivalent of bluebird.each
 */
export const forEach = <T>(
  iterable: T[],
  promiseFn: (v: T) => Promise<unknown>
): Promise<unknown[]> => Promise.all(iterable.map(promiseFn));

/**
 * Given a Path and a key, return a new Path containing the new key.
 */
export function addPath(
  prev: Path | undefined,
  key: string | number,
): Path {
  return { prev, key };
}

/**
 * Given a Path, return an Array of the path keys.
 */
export function pathToArray(path: Path): Array<string | number> {
  const flattened = [];
  let curr: Path | undefined = path;
  while (curr) {
    flattened.push(curr.key);
    curr = curr.prev;
  }
  return flattened.reverse();
}
