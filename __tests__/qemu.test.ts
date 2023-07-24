import {isSelfHostedRunner} from '../src/qemu';

describe(isSelfHostedRunner, () => {
  it('returns true for self-hosted runner', () => {
    process.env.RUNNER_OS = 'self-hosted';
    expect(isSelfHostedRunner()).toEqual(true);
  });

  it('returns false for non self-hosted runner', () => {
    process.env.RUNNER_OS = 'ubuntu-latest';
    expect(isSelfHostedRunner()).toEqual(false);
  });

  it('returns false for empty RUNNER_OS', () => {
    process.env.RUNNER_OS = '';
    expect(isSelfHostedRunner()).toEqual(false);
  });
});
