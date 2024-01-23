import * as exec from '@actions/exec';
import * as state from './state';
import {buildxCachePath, buildxNewCachePath} from './cache';
import {debug, endGroup, info, startGroup, warning} from '@actions/core';
import {Inputs} from './inputs';
import * as fs from 'fs';

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
  await asyncForEach(inputs.labels, async label => {
    args.push('--label', label);
  });
  if (!inputs.skipDefaultTag) {
    args.push('--tag', defaultTag);
  }
  const shaTagWithPrefix = await getSHATagWithPrefix(inputs.repository);
  if (!inputs.skipTagWithPrefix && !inputs.skipDefaultTag) {
    args.push('--tag', shaTagWithPrefix);
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

async function getSHA(): Promise<string> {
  const res = await exec.getExecOutput('git', ['rev-parse', 'HEAD'], {
    silent: true
  });
  if (res.stderr !== '' && res.exitCode) {
    throw new Error(`git rev-parse HEAD failed: ${res.stderr.trim()}`);
  }
  return res.stdout.trim();
}

async function getSHATag(repository: string): Promise<string> {
  const sha = await getSHA();
  return `${repository}:${sha}`;
}

async function getSHATagWithPrefix(repository: string): Promise<string> {
  const sha = await getSHA();
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error('GITHUB_EVENT_PATH env variable not found');
  }
  const eventContent = await fs.promises.readFile(eventPath, {
    encoding: 'utf8'
  });
  const event = JSON.parse(eventContent);
  const default_branch = event?.repository?.default_branch;
  if (typeof default_branch != 'string') {
    throw new Error(
      `Unable to extract repository.default_branch from ${eventPath}`
    );
  }

  let shaWithPrefix: string;
  const ref = event?.ref || '';
  const schedule = event?.schedule || '';
  if (
    (ref !== '' && ref === `refs/heads/${default_branch}`) ||
    schedule !== ''
  ) {
    // on merge to default branch or on scheduled workflow
    shaWithPrefix = `${default_branch}-${sha}`;
  } else if (ref !== '' && ref.startsWith('refs/tags')) {
    // on push to tags
    shaWithPrefix = `tag-${sha}`;
  } else {
    // on pull request
    const number = event?.number;
    const issueNumber = event?.issue?.number;
    if (typeof number == 'number') {
      shaWithPrefix = `pr-${number}-${sha}`;
    } else if (typeof issueNumber == 'number') {
      shaWithPrefix = `pr-${issueNumber}-${sha}`;
    } else {
      throw new Error(
        "Unable to establish if it's a merge on master or a push on a pull request or a comment on pull request or a push to tags!"
      );
    }
  }
  return `${repository}:${shaWithPrefix}`;
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
