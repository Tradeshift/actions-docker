import {isECRRepository, getRegion} from '../src/aws';

describe(isECRRepository, () => {
  it('returns true when given an ECR repository', () => {
    expect(
      isECRRepository('123456789012.dkr.ecr.eu-west-1.amazonaws.com')
    ).toEqual(true);
    expect(
      isECRRepository('123456789012.dkr.ecr.cn-north-1.amazonaws.com.cn')
    ).toEqual(true);
    expect(
      isECRRepository('123456789012.dkr.ecr.eu-west-1.amazonaws.com/my-image')
    ).toEqual(true);
    expect(
      isECRRepository('123456789012.dkr.ecr.eu-west-1.amazonaws.com/my-image')
    ).toEqual(true);
  });

  it('returns false when given a non-ECR repository', () => {
    expect(isECRRepository('eu.gcr.io/tradeshift-base/my-image')).toEqual(
      false
    );
    expect(isECRRepository('test')).toEqual(false);
    expect(isECRRepository('test/test')).toEqual(false);
  });
});

describe('getRegion', () => {
  it('returns us-east-1 when given an ECR public repository', () => {
    expect(getRegion('public.ecr.aws/tradeshift/my-image')).toEqual(
      'us-east-1'
    );
  });
  it('returns eu-west-1 when given an ECR private repository in eu-west-1', () => {
    expect(
      getRegion('123456789012.dkr.ecr.eu-west-1.amazonaws.com/my-image')
    ).toEqual('eu-west-1');
  });
  it('returns cn-north-1 when given an ECR private repository in cn-north-1', () => {
    expect(
      getRegion('123456789012.dkr.ecr.cn-north-1.amazonaws.com.cn/my-image')
    ).toEqual('cn-north-1');
  });
});
