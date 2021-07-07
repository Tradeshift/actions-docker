import {setFailed} from '@actions/core';
import {getInputs, Inputs} from './inputs';
import * as docker from './docker';
import * as state from './state';
import * as buildx from './buildx';
import * as cache from './cache';

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

    await cache.restore(inputs);
    await buildx.setup(inputs.builder);
    await docker.build(inputs);
  } catch (error) {
    setFailed(error.message);
  }
}

async function post(inputs: Inputs): Promise<void> {
  await cache.save(inputs);
  await docker.logout(state.registry);
  await buildx.stop(state.builderName);
}

run();
