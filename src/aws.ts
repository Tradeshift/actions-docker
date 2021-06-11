import {which} from '@actions/io';
import * as semver from 'semver';
import {exec} from './exec';
import {info} from '@actions/core';

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
  const res = await exec(cli, args, true);
  if (res.stderr !== '' && !res.success) {
    throw new Error(res.stderr);
  } else if (res.stderr !== '') {
    return res.stderr.trim();
  }
  return res.stdout.trim();
}

function getRegion(registry: string): string {
  if (isPubECRRepository(registry)) {
    return (
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
    );
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

export async function getECRPassword(repository: string): Promise<string> {
  const cliPath = await getCLI();
  const cliVersion = await getCLIVersion();
  const region = getRegion(repository);

  if (isPubECRRepository(repository)) {
    info(`💡 AWS Public ECR detected with ${region} region`);
  } else {
    info(`💡 AWS ECR detected with ${region} region`);
  }

  info(
    `⬇️ Retrieving docker login password through AWS CLI ${cliVersion} (${cliPath})...`
  );

  return getDockerLoginPWD(repository, region);
}
