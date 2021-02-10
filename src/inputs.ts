import csvparse from 'csv-parse/lib/sync';
import {getInput} from '@actions/core';
import {context} from '@actions/github';
import {getECRPassword, isECRRepository} from './aws';

export interface Inputs {
  buildArgs: string[];
  context: string;
  file: string;
  labels: string[];
  password: string;
  push: boolean;
  repository: string;
  tags: string[];
  username: string;
}

export async function getInputs(): Promise<Inputs> {
  const inputs: Inputs = {
    buildArgs: await getInputList('build-args'),
    context: getInput('context'),
    file: getInput('file'),
    labels: await getInputList('labels'),
    password: getInput('password'),
    push: /true/i.test(getInput('push')),
    repository: getInput('repository') || defaultRepository(),
    tags: await getInputList('tags'),
    username: getInput('username')
  };
  if (isECRRepository(inputs.repository)) {
    inputs.username = 'AWS';
    inputs.password = await getECRPassword(inputs.repository);
  }
  return inputs;
}

function defaultRepository(): string {
  return `eu.gcr.io/tradeshift-base/${context.repo.repo}`;
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
