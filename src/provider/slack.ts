/**
 * The results of an OAuth operation with Slack.
 *
 * {@link https://api.slack.com/methods/oauth.v2.access#examples | See the official Slack documentation for
 * more details. }
 */
export interface INative {
  ok: boolean;
  team: { id: string; name: string };
  scope: string;
  app_id: string;
  status: 'authenticated';
  timestamp: number;
  enterprise: null | { id: string; name: string };
  token_type: 'bot' | 'user';
  authed_user: { id: string; scope: string; access_token: string; token_type: string };
  bot_user_id: string;
  access_token: string;
  is_enterprise_install: boolean;
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
