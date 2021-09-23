import {exec} from './exec';
import {endGroup, startGroup, warning} from '@actions/core';

export async function setup(): Promise<void> {
  startGroup(`🖥️ Setup qemu`);
  const res = await exec(
    'docker',
    [
      'run',
      '--privileged',
      '--rm',
      'eu.gcr.io/tradeshift-base/tonistiigi/binfmt:qemu-v6.1.0',
      '--install',
      'all'
    ],
    false
  );
  if (res.stderr !== '' && !res.success) {
    warning(res.stderr);
  }
  endGroup();
}
