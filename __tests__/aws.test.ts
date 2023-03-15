import {isECRRepository} from '../src/aws';

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
    expect(isECRRepository('063399264027.dkr.ecr.eu-west-1.amazonaws.com/tradeshift-base/my-image')).toEqual(
      false
    );
    expect(isECRRepository('test')).toEqual(false);
    expect(isECRRepository('test/test')).toEqual(false);
  });
});
