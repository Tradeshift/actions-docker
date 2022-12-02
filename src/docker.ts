import * as exec from '@actions/exec';
import * as state from './state';
import {buildxCachePath, buildxNewCachePath} from './cache';
import {debug, endGroup, info, startGroup, warning} from '@actions/core';
import {Inputs} from './inputs';

export async function build(inputs: Inputs): Promise<string> {
  startGroup('🏃 Starting build');

  const shaTag = await getSHATag(inputs.repository);
  const outputTag = inputs.skipDefaultTag ? inputs.tags[0] : shaTag;
  if (!outputTag) {
    throw new Error(
      'No image tags specified. Default tag disabled and no tags specified'
    );
  }
  const args = await getBuildArgs(inputs, shaTag);
  const res = await exec.getExecOutput('docker', args);
  if (res.stderr !== '' && res.exitCode) {
    throw new Error(`buildx call failed: ${res.stderr.trim()}`);
  }
  endGroup();
  return outputTag;
}

async function getBuildArgs(
  inputs: Inputs,
  defaultTag: string
): Promise<string[]> {
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
  if (!inputs.skipDefaultTag) {
    args.push('--tag', defaultTag);
  }
  if (inputs.platform) {
    args.push('--platform', inputs.platform);
  }
  if (inputs.push) {
    args.push('--push');
  }
  if (inputs.load) {
    args.push('--load');
  }
  if (inputs.repoCache) {
    args.push('--cache-from', `type=local,src=${buildxCachePath}`);
    args.push('--cache-to', `type=local,dest=${buildxNewCachePath}`);
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

async function getSHATag(repository: string): Promise<string> {
  const res = await exec.getExecOutput('git', ['rev-parse', 'HEAD'], {
    silent: true
  });
  if (res.stderr !== '' && res.exitCode) {
    throw new Error(`git rev-parse HEAD failed: ${res.stderr.trim()}`);
  }
  return `${repository}:${res.stdout.trim()}`;
}

export async function version(): Promise<void> {
  const res = await exec.getExecOutput('docker', ['version']);
  if (res.stderr !== '' && res.exitCode) {
    warning(res.stderr);
    return;
  }
}

export async function login(
  registry: string,
  username: string,
  password: string
): Promise<void> {
  if (!username || !password) {
    debug('Username or password not set. Skipping login.');
    return;
  }

  startGroup('🔑 Logging in');

  const args = ['login', '--password-stdin', '--username', username];

  if (registry !== '') {
    args.push(registry);
    info(`🔑 Logging into ${registry}...`);
  } else {
    info(`🔑 Logging into Docker Hub...`);
  }

  const res = await exec.getExecOutput('docker', args, {
    input: Buffer.from(password, 'utf-8')
  });
  if (res.stderr !== '' && res.exitCode) {
    throw new Error(res.stderr);
  }
  state.setRegistry(registry);
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
  const res = await exec.getExecOutput('docker', ['logout', registry]);
  if (res.stderr !== '' && res.exitCode) {
    warning(res.stderr);
    return;
  }
  info('👋 Logged out.');
}
