export type INative = any;

export const normalize = (native: any) => ({
  native,
  accessToken: native.access_token,
  fusebit: native.fusebit,
});
