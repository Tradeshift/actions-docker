import {setFailed} from '@actions/core';
import {getInputs} from './inputs';
import * as docker from './docker';
import * as state from './state';
import * as buildx from './buildx';

async function run(): Promise<void> {
  try {
    if (state.isPost) {
      await post();
      return;
    }
    state.setIsPost();

    const inputs = await getInputs();
    await docker.login(inputs.repository, inputs.username, inputs.password);
    await buildx.setup();
    await docker.build(inputs);
  } catch (error) {
    setFailed(error.message);
  }
}

async function post(): Promise<void> {
  await docker.logout(state.registry);
  await buildx.stop(state.builderName);
}

run();
