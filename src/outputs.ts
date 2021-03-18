import {setOutput} from '@actions/core';

export function setBuilder(name: string): void {
  setOutput('builder', name);
}
