import * as git from './git';
import * as state from './state';
import {endGroup, info, startGroup} from '@actions/core';
import {mv, rmRF} from '@actions/io';
import {restoreCache, saveCache} from '@actions/cache';
import {Inputs} from './inputs';

export const buildxCachePath = '/tmp/.buildx-cache';
export const buildxNewCachePath = '/tmp/.buildx-cache-new';

export async function restore(inputs: Inputs): Promise<void> {
  if (inputs.repoCache) {
    startGroup('🚚 Restoring cache from Github repo cache...');

    const primaryKey = await getRepoCacheKey(inputs);
    state.setCacheKey(primaryKey);
    const restoreKeys = getRepoCacheRestoreKeys(inputs);
    const cacheKey = await restoreCache(
      [buildxCachePath],
      primaryKey,
      restoreKeys
    );

    if (!cacheKey) {
      info(
        `Cache not found for input keys: ${[primaryKey, ...restoreKeys].join(
          ', '
        )}`
      );
      endGroup();
      return;
    }

    if (isExactKeyMatch(primaryKey, cacheKey)) {
      state.setCacheKeyExactMatch();
    }

    info(`Cache restored from key: ${cacheKey}`);

    endGroup();
  }
}

function isExactKeyMatch(key: string, cacheKey?: string): boolean {
  return !!(
    cacheKey &&
    cacheKey.localeCompare(key, undefined, {
      sensitivity: 'accent'
    }) === 0
  );
}

export async function save(inputs: Inputs): Promise<void> {
  if (inputs.repoCache) {
    startGroup('🚚 Saving cache in Github repo cache...');

    const primaryKey = state.cacheKey;
    if (state.isCacheKeyExactMatch) {
      info(
        `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`
      );
      endGroup();
      return;
    }

    await rmRF(buildxCachePath);
    await mv(buildxNewCachePath, buildxCachePath);
    await saveCache([buildxCachePath], primaryKey);

    info(`Saved cache with key: ${primaryKey}`);

    endGroup();
  }
}

function getRepoCacheRestoreKeys(inputs: Inputs): string[] {
  return [`${inputs.repoCacheKey}-`];
}

async function getRepoCacheKey(inputs: Inputs): Promise<string> {
  return `${inputs.repoCacheKey}-${await git.headSHA()}`;
}
