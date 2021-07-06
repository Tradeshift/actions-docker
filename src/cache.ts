import {saveCache, restoreCache} from '@actions/cache';
import {endGroup, startGroup, info} from '@actions/core';
import {rmRF, mv} from '@actions/io';
import * as git from '@tradeshift/actions-git';
import {Inputs} from './inputs';

export const buildxCachePath = '/tmp/.buildx-cache';
export const buildxNewCachePath = '/tmp/.buildx-cache-new';

export async function restore(inputs: Inputs): Promise<void> {
  if (inputs.repoCache) {
    startGroup('☀ Restoring cache...');
    await restoreCache(
      [buildxCachePath],
      getRepoCacheKey(inputs),
      getRepoCacheRestoreKeys(inputs)
    );
    info('Restored cache.');
    endGroup();
  }
}

export async function save(inputs: Inputs): Promise<void> {
  if (inputs.repoCache) {
    startGroup('❄ Saving cache...');
    await rmRF(buildxCachePath);
    await mv(buildxNewCachePath, buildxCachePath);
    await saveCache([buildxCachePath], getRepoCacheKey(inputs));
    info('Saved cache.');
    endGroup();
  }
}

function getRepoCacheRestoreKeys(inputs: Inputs): string[] {
  return [`${inputs.repoCacheKey}-`];
}

function getRepoCacheKey(inputs: Inputs): string {
  return `${inputs.repoCacheKey}-${git.headSHA()}`;
}
