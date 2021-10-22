import * as buildx from './buildx';
import * as cache from './cache';
import * as docker from './docker';
import * as qemu from './qemu';
import * as state from './state';

import {Inputs, getInputs} from './inputs';
import {setFailed} from '@actions/core';

async function run(): Promise<void> {
  try {
    const inputs = await getInputs();

    if (state.isPost) {
      await post(inputs);
      return;
    }

    state.setIsPost();

    const registry = docker.getRegistry(inputs.repository);
    await docker.login(registry, inputs.username, inputs.password);
    if (inputs.authOnly) {
      return;
    }
    if (inputs.qemu) {
      await qemu.setup();
    }

    await cache.restore(inputs);
    await buildx.setup(inputs.builder);
    const shaTag = await docker.build(inputs);
    if (inputs.push) {
      await buildx.inspect(shaTag);
    }
  } catch (error) {
    setFailed((error as Error).message);
  }
}

async function post(inputs: Inputs): Promise<void> {
  await cache.save(inputs);
  await docker.logout(state.registry);
  await buildx.stop(state.builderName);
}

run();
