import exec from '@actions/exec';

export async function headSHA(): Promise<string> {
  const res = await exec.getExecOutput('git', ['rev-parse', 'HEAD'], {
    silent: true
  });
  if (res.exitCode !== 0 || res.stderr !== '') {
    throw new Error(`could not get git head sha: ${res.stderr}`);
  }

  return res.stdout.trim();
}
