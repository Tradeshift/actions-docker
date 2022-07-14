import * as fs from 'fs';
import * as os from 'os';
import * as outputs from './outputs';
import * as path from 'path';
import * as semver from 'semver';
import * as state from './state';
import * as tc from '@actions/tool-cache';
import * as uuid from 'uuid';

import {debug, endGroup, info, startGroup, warning} from '@actions/core';
import {HttpClient} from '@actions/http-client';
import {exec, getExecOutput} from '@actions/exec';

export async function setup(builderName: string): Promise<void> {
  if (!(await isAvailable())) {
    await install();
  }

  const buildxVersion = await getVersion();
  info(`📣 Buildx version: ${buildxVersion}`);

  if (!builderName) {
    builderName = `builder-${uuid.v4()}`;
    state.setBuilder(builderName);
    await createBuilder(builderName);
    await bootBuilder(builderName);
  }
  outputs.setBuilder(builderName);
  await useBuilder(builderName);
}

export async function stop(builderName: string): Promise<void> {
  if (builderName.length === 0) {
    return;
  }

  startGroup(`🧹 Cleaning up builder`);

  const res = await getExecOutput('docker', ['buildx', 'rm', builderName]);
  if (res.stderr !== '' && res.exitCode) {
    warning(res.stderr);
  }

  endGroup();
}

async function createBuilder(name: string): Promise<void> {
  startGroup(`🔨 Creating a new builder instance`);

  const context = 'builders';
  await exec('docker', ['context', 'create', context]);

  const args = [
    'buildx',
    'create',
    '--name',
    name,
    '--driver',
    'docker-container',
    context
  ];
  await exec('docker', args);

  endGroup();
}

async function bootBuilder(name: string): Promise<void> {
  startGroup(`🏃 Booting builder`);

  const args = ['buildx', 'inspect', '--bootstrap', '--builder', name];
  await exec('docker', args);

  endGroup();
}

async function useBuilder(name: string): Promise<void> {
  startGroup(`Using builder`);

  const args = ['buildx', 'use', name];
  await exec('docker', args);
  await ls();

  endGroup();
}

async function getVersion(): Promise<string> {
  const res = await getExecOutput('docker', ['buildx', 'version'], {
    silent: true
  });
  if (res.stderr !== '' && res.exitCode) {
    throw new Error(res.stderr);
  }
  return parseVersion(res.stdout);
}

export async function inspect(shatag: string): Promise<void> {
  startGroup(`📦 Pushed image`);
  const res = await getExecOutput('docker', [
    'buildx',
    'imagetools',
    'inspect',
    shatag
  ]);
  if (res.stderr !== '' && res.exitCode) {
    throw new Error(res.stderr);
  }
  endGroup();
}

async function ls(): Promise<void> {
  const res = await getExecOutput('docker', ['buildx', 'ls']);
  if (res.stderr !== '' && res.exitCode) {
    throw new Error(res.stderr);
  }
}

async function parseVersion(stdout: string): Promise<string> {
  const matches = /\sv?([0-9.]+)/.exec(stdout);
  if (!matches) {
    throw new Error(`Cannot parse Buildx version`);
  }
  const version = semver.clean(matches[1]);
  if (!version) {
    throw new Error(`Cannot clean buildx semver version`);
  }
  return version;
}

async function isAvailable(): Promise<boolean> {
  const res = await getExecOutput('docker', ['buildx']);
  return res.stderr === '' && !res.exitCode;
}

async function install(inputVersion = 'latest'): Promise<void> {
  startGroup(`👉 Installing Buildx`);

  const release: GithubRelease | null = await getRelease(inputVersion);
  if (!release) {
    throw new Error(`Cannot find buildx ${inputVersion} release`);
  }

  const version = release.tag_name.replace(/^(v)/, '');

  let toolPath: string;
  toolPath = tc.find('buildx', version);
  if (!toolPath) {
    const c = semver.clean(version) || '';
    if (!semver.valid(c)) {
      throw new Error(`Invalid Buildx version "${version}".`);
    }
    toolPath = await download(version);
  }

  const dockerConfigHome: string =
    process.env.DOCKER_CONFIG || path.join(os.homedir(), '.docker');
  const pluginsDir: string = path.join(dockerConfigHome, 'cli-plugins');
  debug(`Plugins dir is ${pluginsDir}`);
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir, {recursive: true});
  }

  const binName: string =
    os.platform() === 'win32' ? 'docker-buildx.exe' : 'docker-buildx';
  const pluginPath: string = path.join(pluginsDir, binName);
  debug(`Plugin path is ${pluginPath}`);
  fs.copyFileSync(path.join(toolPath, binName), pluginPath);

  info('🔨 Fixing perms...');
  fs.chmodSync(pluginPath, '0755');

  endGroup();
}

async function download(version: string): Promise<string> {
  const downloadUrl = `https://github.com/docker/buildx/releases/download/v${version}/buildx-v${version}.linux-amd64`;

  info(`⬇️ Downloading ${downloadUrl}...`);
  const downloadPath = await tc.downloadTool(downloadUrl);
  debug(`Downloaded to ${downloadPath}`);

  return tc.cacheFile(downloadPath, 'docker-buildx', 'buildx', version);
}

interface GithubRelease {
  id: number;
  tag_name: string;
}

async function getRelease(version: string): Promise<GithubRelease | null> {
  const url = `https://github.com/docker/buildx/releases/${version}`;
  const http = new HttpClient('setup-buildx');
  return (await http.getJson<GithubRelease>(url)).result;
}
