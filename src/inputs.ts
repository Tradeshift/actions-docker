import {getECRPassword, isECRRepository, exportCredentials} from './aws';
import {context} from '@actions/github';
import csvparse from 'csv-parse/lib/sync';
import {getInput, getMultilineInput} from '@actions/core';

export interface Inputs {
  buildArgs: string[];
  builder: string;
  context: string;
  file: string;
  labels: string[];
  load: boolean;
  password: string;
  platform: string;
  push: boolean;
  repoCache: boolean;
  repoCacheKey: string;
  repository: string;
  registries: string[];
  skipDefaultTag: boolean;
  skipTagWithPrefix: boolean;
  tags: string[];
  username: string;
  authOnly: boolean;
  useqemu: boolean;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
}

function isSelfHostedRunner(): boolean {
  const labels = process.env.RUNNER_LABELS || '';
  return labels?.includes('self-hosted');
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
    platform: getInput('platform'),
    push: /true/i.test(getInput('push')),
    repoCache: getInput('repo-cache') === 'true',
    repoCacheKey: getInput('repo-cache-key'),
    repository: getInput('repository') || defaultRepository(),
    registries: getMultilineInput('registries'),
    skipDefaultTag: getInput('skip-default-tag') === 'true',
    skipTagWithPrefix: getInput('skip-tag-with-prefix') === 'true',
    tags: await getInputList('tags'),
    username: getInput('username'),
    authOnly: getInput('auth-only') === 'true',
    useqemu: getInput('useqemu') === 'true',
    awsAccessKeyId: getInput('aws-access-key-id'),
    awsSecretAccessKey: getInput('aws-secret-access-key')
  };
  if (isECRRepository(inputs.repository)) {
    if (!isSelfHostedRunner()) {
      exportCredentials(inputs.awsAccessKeyId, inputs.awsSecretAccessKey);
    }
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
