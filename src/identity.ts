interface IEveryAuthCredential {}

type IEveryAuthTagSearchSet = Record<string, string | number | undefined | null>;

interface IEveryAuthSearchOptions {
  next?: string;
  pageSize?: number;
}

export const getIdentity = async (
  serviceId: string,
  credentialOrUserIdOrAttributes: string | IEveryAuthTagSearchSet
): Promise<IEveryAuthCredential> => {
  // Determine which lookup mode we're in:
  //   * credential (aka idn-123)
  //   * userid (any other string), or
  //    - call getIdentityByUser
  //    - throw if > 1
  //   * tag search record (which will need to be translated to a wire)
  //    - call getIdentityByTags
  //    - throw if > 1
  // getIdentityById()
  return '';
};

export const getIdentities = async (
  serviceId: string,
  attributes: IEveryAuthTagSearchSet,
  options?: IEveryAuthSearchOptions
): Promise<IEveryAuthCredential> => {
  // call getIdentityByTags
  return '';
};

const getIdentityById = async (serviceId: string, identityId: string): Promise<IEveryAuthCredential> => {
  // GET /connector/:serviceId/api/token/:identityId
};

const getIdentityByUser = async (serviceId: string, userId: string): Promise<IEveryAuthCredential> => {
  // getIdentityByTags(serviceId, { 'fusebit.tenantId': :userId});
  // Throw if > 1
  // GET /connector/:serviceId/api/token/:identityId
};

const getIdentityByTags = async (
  serviceId: string,
  tags: IEveryAuthTagSearchSet,
  options: IEveryAuthSearchOptions
): Promise<IEveryAuthCredential> => {
  // GET /connector/:serviceId/identity/?tag=fusebit.tenantId=:userId
};
