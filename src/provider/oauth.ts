export interface INative {
  access_token: string;
  fusebit: {
    accountId: string;
    subscriptionId: string;
    serviceId: string;
    identityId: string;
  };
}

export const normalize = (native: INative) => ({
  native,
  accessToken: native.access_token,
  fusebit: native.fusebit,
});
