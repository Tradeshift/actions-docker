import * as semver from 'semver';

import {info} from '@actions/core';
import {which} from '@actions/io';
import {getExecOutput} from '@actions/exec';

import ecrIAMPolicy from './resources/ecr-iam-policy.json';
import ecrLifecyclePolicy from './resources/ecr-lifecycle-policy.json';

const ecrRepositoryRegex =
  /^(([0-9]{12})\.dkr\.ecr\.(.+)\.amazonaws\.com(.cn)?)(\/([^:]+)(:.+)?)?$/;

export function isECRRepository(repository: string): boolean {
  return ecrRepositoryRegex.test(repository) || isPubECRRepository(repository);
}

function isPubECRRepository(repository: string): boolean {
  return repository.startsWith('public.ecr.aws');
}

async function getCLI(): Promise<string> {
  return which('aws', true);
}

async function getCLIVersion(): Promise<string> {
  return parseCLIVersion(await execCLI(['--version']));
}

async function parseCLIVersion(stdout: string): Promise<string> {
  const matches = /aws-cli\/([0-9.]+)/.exec(stdout);
  if (matches === null) {
    throw new Error(`Cannot parse AWS CLI version`);
  }
  const version = semver.clean(matches[1]);
  if (version === null) {
    throw new Error('Cannot semver parse version');
  }
  return version;
}

async function execCLI(args: string[]): Promise<string> {
  const cli = await getCLI();
  const res = await getExecOutput(cli, args, {
    silent: true,
    ignoreReturnCode: true
  });
  if (res.stderr !== '' && res.exitCode) {
    throw new Error(res.stderr);
  } else if (res.stderr !== '') {
    return res.stderr.trim();
  }
  return res.stdout.trim();
}

export function getRegion(registry: string): string {
  if (isPubECRRepository(registry)) {
    return 'us-east-1';
  }
  const matches = registry.match(ecrRepositoryRegex);
  if (matches === null) {
    return '';
  }
  return matches[3];
}

async function getDockerLoginPWD(
  repository: string,
  region: string
): Promise<string> {
  const ecrCmd = isPubECRRepository(repository) ? 'ecr-public' : 'ecr';
  return execCLI([ecrCmd, 'get-login-password', '--region', region]);
}

async function ensureEcrRepositoryExists(
  repository: string,
  region: string
): Promise<void> {
  const ecrCmd = isPubECRRepository(repository) ? 'ecr-public' : 'ecr';
  const matches = ecrRepositoryRegex.exec(repository);
  if (matches === null) {
    throw new Error(
      `${repository} seems to be malformed. Please correct it and try again...`
    );
  }
  const res = await getExecOutput(
    await getCLI(),
    [
      ecrCmd,
      'describe-repositories',
      '--region',
      region,
      '--repository-names',
      matches[6]
    ],
    {silent: true, ignoreReturnCode: true}
  );

  if (res.exitCode === 254) {
    info(`⚒️ ${matches[6]} does not exist, creating...`);
    await execCLI([
      ecrCmd,
      'create-repository',
      '--region',
      region,
      '--repository-name',
      matches[6]
    ]);

    await execCLI([
      ecrCmd,
      'set-repository-policy',
      '--region',
      region,
      '--repository-name',
      matches[6],
      '--policy-text',
      JSON.stringify(ecrIAMPolicy)
    ]);

    await execCLI([
      ecrCmd,
      'put-lifecycle-policy',
      '--region',
      region,
      '--repository-name',
      matches[6],
      '--lifecycle-policy-text',
      JSON.stringify(ecrLifecyclePolicy)
    ]);
  }
}

export async function getECRPassword(repository: string): Promise<string> {
  const cliPath = await getCLI();
  const cliVersion = await getCLIVersion();
  const region = getRegion(repository);

  if (isPubECRRepository(repository)) {
    info(`💡 AWS Public ECR detected with ${region} region`);
  } else {
    info(`💡 AWS ECR detected with ${region} region`);

    info(
      `✔️ Checking if repository exists through AWS CLI ${cliVersion} (${cliPath})...`
    );

    await ensureEcrRepositoryExists(repository, region);
  }

  info(
    `⬇️ Retrieving docker login password through AWS CLI ${cliVersion} (${cliPath})...`
  );

  return getDockerLoginPWD(repository, region);
}
