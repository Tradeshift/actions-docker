import {getState, saveState} from '@actions/core';

export const isPost = getState('isPost') === 'true';
export const registry = getState('registry');
export const builderName = getState('builderName');
export const cacheKey = getState('cacheKey');
export const isCacheKeyExactMatch = getState('cacheKeyExactMatch') === 'true';

export function setRegistry(s: string): void {
  saveState('registry', s);
}

export function setIsPost(): void {
  saveState('isPost', 'true');
}

export function setBuilder(s: string): void {
  saveState('builderName', s);
}

export function setCacheKey(s: string): void {
  saveState('cacheKey', s);
}

export function setCacheKeyExactMatch(): void {
  saveState('cacheKeyExactMatch', 'true');
}
