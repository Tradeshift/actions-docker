import csvparse from 'csv-parse/lib/sync';
import {getInput} from '@actions/core';
import {context} from '@actions/github';
import {getECRPassword, isECRRepository} from './aws';

export interface Inputs {
  buildArgs: string[];
  builder: string;
  context: string;
  file: string;
  labels: string[];
  load: boolean;
  password: string;
  push: boolean;
  repoCache: boolean;
  repoCacheKey: string;
  repository: string;
  tags: string[];
  username: string;
  authOnly: boolean;
}

export async function getInputs(): Promise<Inputs> {
  const inputs: Inputs = {
    buildArgs: await getInputList('build-args'),
    builder: getInput('builder'),
    context: getInput('context'),
    file: getInput('file'),
    labels: await getInputList('labels'),
    load: getInput('load') === 'true',
    password: getInput('password'),
    push: /true/i.test(getInput('push')),
    repoCache: getInput('repo-cache') === 'true',
    repoCacheKey: getInput('repo-cache-key'),
    repository: getInput('repository') || defaultRepository(),
    tags: await getInputList('tags'),
    username: getInput('username'),
    authOnly: getInput('auth-only') === 'true'
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
