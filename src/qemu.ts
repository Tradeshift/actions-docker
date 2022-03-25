import {endGroup, startGroup, warning} from '@actions/core';
import {getExecOutput} from '@actions/exec';

export async function setup(): Promise<void> {
  startGroup(`🖥️ Setup qemu`);
  const res = await getExecOutput('docker', [
    'run',
    '--privileged',
    '--rm',
    'eu.gcr.io/tradeshift-base/tonistiigi/binfmt:qemu-v6.1.0',
    '--install',
    'all'
  ]);
  if (res.stderr !== '' && res.exitCode) {
    warning(res.stderr);
  }
  endGroup();
}
