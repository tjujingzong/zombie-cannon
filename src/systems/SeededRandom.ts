export type RandomSource = () => number;

/** FNV-1a 32-bit hash，适合把日期和流名称稳定映射为种子。 */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function deriveSeed(seed: number, stream: string): number {
  return hashString(`${seed >>> 0}:${stream}`);
}

/** Mulberry32：速度快，且跨浏览器结果稳定。 */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}
