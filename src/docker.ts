import {info, warning, startGroup, endGroup} from '@actions/core';
import {exec} from './exec';
import {Inputs} from './inputs';
import {setRegistry} from './state';

export async function build(inputs: Inputs): Promise<void> {
  startGroup('🏃 Starting build');

  const args = await getBuildArgs(inputs);
  const res = await exec('docker', args, false);
  if (res.stderr !== '' && !res.success) {
    throw new Error(`buildx call failed: ${res.stderr.trim()}`);
  }

  endGroup();
}

async function getBuildArgs(inputs: Inputs): Promise<string[]> {
  const args = ['buildx', 'build'];
  if (inputs.file) {
    args.push('--file', inputs.file);
  }
  await asyncForEach(inputs.buildArgs, async buildArg => {
    args.push('--build-arg', buildArg);
  });
  await asyncForEach(inputs.tags, async tag => {
    args.push('--tag', tag);
  });
  args.push('--tag', await shaTag(inputs.repository));
  if (inputs.push) {
    args.push('--push');
  }
  args.push(inputs.context);
  return args;
}

const registryRegex = RegExp('^[a-zA-Z0-9-.]+');

export function getRegistry(repository: string): string {
  const match = registryRegex.exec(repository);
  if (match === null) {
    throw new Error(`could not determine registry: ${repository}`);
  }
  if (match[0].includes('.')) {
    return match[0];
  }
  return '';
}

export function isDockerhubRepository(repository: string): boolean {
  const registry = getRegistry(repository);
  return registry === '';
}

async function shaTag(repository: string): Promise<string> {
  const res = await exec('git', ['rev-parse', 'HEAD'], true);
  if (res.stderr !== '' && !res.success) {
    throw new Error(`git rev-parse HEAD failed: ${res.stderr.trim()}`);
  }
  return `${repository}:${res.stdout.trim()}`;
}

export async function login(
  registry: string,
  username: string,
  password: string
): Promise<void> {
  startGroup('🔑 Logging in');

  if (!username || !password) {
    throw new Error('Username and password required');
  }

  const args = ['login', '--password-stdin', '--username', username];

  if (registry !== '') {
    args.push(registry);
    info(`🔑 Logging into ${registry}...`);
  } else {
    info(`🔑 Logging into Docker Hub...`);
  }

  const res = await exec('docker', args, false, password);
  if (res.stderr !== '' && !res.success) {
    throw new Error(res.stderr);
  }
  setRegistry(registry);
  info('🎉 Login Succeeded!');

  endGroup();
}

async function asyncForEach<T>(
  array: T[],
  callback: (e: T) => Promise<void>
): Promise<void> {
  for (const e of array) {
    await callback(e);
  }
}

export async function logout(registry: string): Promise<void> {
  const res = await exec('docker', ['logout', registry], false);
  if (res.stderr !== '' && !res.success) {
    warning(res.stderr);
    return;
  }
  info('👋 Logged out.');
}
