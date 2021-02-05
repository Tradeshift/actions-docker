import {saveState, getState} from '@actions/core';

export const isPost = getState('isPost') === 'true';
export const registry = getState('registry');
export const builderName = getState('builderName');

export function setRegistry(s: string): void {
  saveState('registry', s);
}

export function setIsPost(): void {
  saveState('isPost', 'true');
}

export function setBuilder(s: string): void {
  saveState('builderName', s);
}
