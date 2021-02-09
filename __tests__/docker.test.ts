import {getRegistry, isDockerhubRepository} from '../src/docker';

describe(isDockerhubRepository, () => {
  it('returns true when given a dockerhub repository', () => {
    expect(isDockerhubRepository('test')).toEqual(true);
    expect(isDockerhubRepository('test/test')).toEqual(true);
    expect(isDockerhubRepository('test/test/test')).toEqual(true);
  });

  it('returns false when given a non-dockerhub repository', () => {
    expect(isDockerhubRepository('test.com')).toEqual(false);
    expect(isDockerhubRepository('test.com/test')).toEqual(false);
    expect(isDockerhubRepository('test.com/test/test')).toEqual(false);
  });
});

describe(getRegistry, () => {
  it('returns empty string when dockerhub', async () => {
    expect(getRegistry('test')).toEqual('');
    expect(getRegistry('test/test')).toEqual('');
    expect(getRegistry('test/test/test')).toEqual('');
  });

  it('detects other registries', async () => {
    expect(getRegistry('test.com')).toEqual('test.com');
    expect(getRegistry('test.com/com')).toEqual('test.com');
    expect(getRegistry('test.com/test/test')).toEqual('test.com');
  });

  it('throws error if registry cannot be determined', () => {
    expect(() => getRegistry('')).toThrow();
    expect(() => getRegistry('/test')).toThrow();
    expect(() => getRegistry('_test')).toThrow();
  });
});
