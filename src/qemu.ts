import {endGroup, startGroup, warning} from '@actions/core';
import {getExecOutput} from '@actions/exec';

export async function setup(registry: string): Promise<void> {
  startGroup(`🖥️ Setup qemu`);
  const res = await getExecOutput('docker', [
    'run',
    '--privileged',
    '--rm',
    `${registry}/tradeshift-base/tonistiigi/binfmt:qemu-v6.2.0`,
    '--install',
    'all'
  ]);
  if (res.stderr !== '' && res.exitCode) {
    warning(res.stderr);
  }
  endGroup();
}
