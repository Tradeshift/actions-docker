import csvparse from 'csv-parse/lib/sync';
import {getInput} from '@actions/core';

export interface Inputs {
  // login inputs
  username: string;
  password: string;
  registry: string;
  // build / push inputs
  context: string;
  file: string;
  labels: string[];
  buildArgs: string[];
  tags: string[];
  push: boolean;
}

export async function getInputs(): Promise<Inputs> {
  return {
    username: getInput('username'),
    password: getInput('password'),
    registry: getInput('registry'),
    context: getInput('context'),
    file: getInput('file'),
    labels: await getInputList('labels'),
    buildArgs: await getInputList('build-args'),
    tags: await getInputList('tags'),
    push: /true/i.test(getInput('push'))
  };
}

async function getInputList(
  name: string,
  ignoreComma = false
): Promise<string[]> {
  const res: string[] = [];

  const items = getInput(name);
  if (items === '') {
    return res;
  }

  const parsed: string[][] = await csvparse(items, {
    columns: false,
    relaxColumnCount: true,
    skipLinesWithEmptyValues: true
  });

  for (const output of parsed) {
    if (output.length === 1) {
      res.push(output[0]);
      continue;
    } else if (!ignoreComma) {
      res.push(...output);
      continue;
    }
    res.push(output.join(','));
  }

  return res.filter(item => item).map(pat => pat.trim());
}
