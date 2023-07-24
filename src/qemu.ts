import {endGroup, startGroup, warning} from '@actions/core';
import {getExecOutput} from '@actions/exec';

const qemuImageSufix = 'tonistiigi/binfmt:qemu-v6.2.0';

export function isSelfHostedRunner(): boolean {
  const runnerType = process.env.RUNNER_OS || '';
  return runnerType.toLowerCase() === 'self-hosted';
}

export async function setup(registry: string): Promise<void> {
  startGroup(`🖥️ Setup qemu`);
  const qemuImage = isSelfHostedRunner()
    ? `${registry}/tradeshift-base/${qemuImageSufix}`
    : `public.ecr.aws/tradeshift/${qemuImageSufix}`;
  const res = await getExecOutput('docker', [
    'run',
    '--privileged',
    '--rm',
    qemuImage,
    '--install',
    'all'
  ]);
  if (res.stderr !== '' && res.exitCode) {
    warning(res.stderr);
  }
  endGroup();
}
