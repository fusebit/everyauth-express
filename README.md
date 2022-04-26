# EveryAuth

EveryAuth is the easiest way for your app to access APIs like Slack, Salesforce, or Github.

```javascript
import everyauth from "@fusebit/everyauth-express";
import { WebClient } from "@slack/web-api";

// Rapidly add support for users to authorize access to Slack APIs
router.use(
  "/slack",
  everyauth.authorize("slack", {
    finishedUrl: "/slack/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

// Easily use these credentials with the native Slack SDK
router.get("/slack/finished", async (req, res) => {
  const userId = "user-123"; // req.user.id in production
  const userCredentials = await everyauth.getIdentity("slack", userId);

  const slack = new WebClient(userCredentials.accessToken);
  const result = await slack.chat.postMessage({
    text: "Hello world from EveryAuth!",
    channel: "#general",
  });

  res.send("Success with EveryAuth");
});
```

Key benefits:

- Express middleware enabling users of your Node.js app to authorize access to third party APIs.
- Out of the box, shared OAuth clients with basic permissions to get you started quickly.
- Full control of the OAuth client configuration when you are ready (bring your own).
- Durable and secure storage of OAuth credentials of your users.
- Flexible identity mapping to reference credentials using concepts native to your app.
- Automatic token refresh.
- Active monitoring and alerting for expired or revoked credentials (coming soon).

EveryAuth consists of Express middleware, a management CLI, and a [Fusebit](https://fusebit.io) service. If you need additional context of the key benefits, check out our [EveryAuth announcement](https://fusebit.io/blog/everyauth/) or ask us a question on [Twitter @fusebitio](https://twitter.com/fusebitio).

## Contents

[Getting started](#getting-started)  
[Supported services](#supported-services)  
[Concepts](#concepts)  
[Authentication](#authentication)  
[Identity mapping](#identity-mapping)  
[Service configuration](#service-configuration)  
[Reference: CLI](#everyauth-cli-reference)  
[Reference: middleware](#everyauth-express-middleware-reference)  
[FAQ](#faq)

## Getting started

Let's assume you have a working <a href="https://expressjs.com/" target="_blank">Express</a> application you want to integrate with Slack to send messages to your users' Slack workspaces. If you don't have an Express app handy, you can quickly <a href="https://expressjs.com/en/starter/generator.html" target="_blank">scaffold a new one</a>.

First, install the EveryAuth CLI:

```bash
npm install -g @fusebit/everyauth-cli
```

Then, create a free [Fusebit](https://fusebit.io) account to use the shared Slack OAuth client. In the root directory of your Express application, run:

```bash
everyauth init
```

The command will create the `.fusebit` directory with details of your Fusebit account, including a generated private key. Do not commit this directory to your source control! If you are using Git, add `.fusebit` to your .gitignore.

Then, add the EveryAuth Express middleware dependency to your app:

```bash
npm install --save @fusebit/everyauth-express
```

Ensure you install the official Slack SDK for our example:

```bash
npm install --save @slack/web-api
```

In your Express app, add a route that allows your users to grant your application authorization to call Slack on their behalf:

```javascript
import everyauth from "@fusebit/everyauth-express";

// When you want to ask your users for authorization to Slack, redirect
// their browser to https://yourservice.com/slack
router.use(
  "/slack",
  everyauth.authorize("slack", {
    // When authorization process completes, user will be redirected to /slack/finished
    finishedUrl: "/slack/finished",

    // The credentials obtained during the authorization process can be later
    // obtained using the identifier returned here, typically a unique user ID in your app
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);
```

Next, add a route the user of your app will be redirected to once the authorization process has finished. This example uses the freshly obtained credentials to send a message to the user's Slack workspace:

```javascript
import { WebClient } from "@slack/web-api";

router.get("/slack/finished", async (req, res) => {
  // Get Slack credentials of the user of your app making this call
  const userId = "user-123"; // req.user.id in production
  const slackCredentials = await everyauth.getIdentity("slack", userId);

  // Use the Node.js Slack client to send a DM message to
  // the user's Slack workspace
  const slack = new WebClient(slackCredentials.accessToken);
  const directMessageChannel = slackCredentials?.native.authed_user.id;
  const result = await slack.chat.postMessage({
    text: "Hello world from EveryAuth!",
    channel: directMessageChannel,
  });

  res.send("Success with EveryAuth");
});
```

Note that the user credentials are securely and durably stored in your Fusebit account - you can obtain and use them in any other place in your application and at any time.

Congratulations, you are done! To test the end-to-end flow, navigate your browser to https://yourservice.com/slack to start the Slack authorization flow. Once you are done, you should see a new message in the #general channel of the Slack workspace you authorized.

## Supported services

EveryAuth supports authorization to the following APIs out of the box:

[Asana](docs/asana.md)  
[Atlassian](docs/atlassian.md)  
[Discord](docs/discord.md)  
[GitHub](docs/githuboauth.md)  
[GitLab](docs/gitlab.md)  
[Google API](docs/google.md)  
[Hubspot](docs/hubspot.md)  
[Linear](docs/linear.md)  
[PagerDuty](docs/pagerduty.md)  
[QuickBooks](docs/quickbooks-online.md)  
[Reddit](docs/reddit.md)  
[Salesforce](docs/sfdc.md)  
[Slack](docs/slack.md)  
[StackOverflow](docs/stackoverflow.md)  

Don't see the service you are looking for? We are constantly adding support for new services. [Check if yours is in the backlog or file a request for one](https://github.com/fusebit/everyauth-express/issues).

## Concepts

- **User** - A person using your web application; it could be you, your friends, or your customers.
- **Tenant** - A large multi-user system uses a _tenant_ concept to identify the larger organization to which a particular _user_ may belong. For example, your _user_ might be Janet, but the _tenant_ might be Sonicity, a large multinational corporation. Generally, _users_ authenticate on behalf of _tenants_, though for single-user environments the _user_ and the _tenant_ might be effectively the same.
- **Service** - A service is a remote SaaS your users are already using, upon which you would like to act on their behalf. For example, your application may modify a HubSpot record, send a message to Slack, or update a Salesforce company on behalf of your application users.
- **Identity** - The necessary tokens, refresh tokens, or other secrets that are used to authorize API calls to a _service_ on behalf of a _user_.
- **Tag** - A key-value pair, for example ("userId", "user-123"). A number of tags can be associated with an _identity_. EveryAuth enables you to lookup an _identity_ or _identities_ associated with a specific set of _tags_.

## Authentication

EveryAuth CLI and middleware communicate with the Fusebit APIs to do their job and need to authorize those calls. The credentials are established when you run `everyauth init` and stored in the `.fusebit/settings.json` file on disk.

The express middleware locates credentials in the following way, in priority order:

1. Programmatically through code via the `everyauth.config()` method.
2. Use a token generated via `everyauth token` in the `EVERYAUTH_TOKEN` environment variable.
3. Use a base64-encoded profile generated via `everyauth profile export | base64` in the `EVERYAUTH_PROFILE_JSON` environment variable 
4. The `EVERYAUTH_PROFILE_PATH` environment variable points to the `settings.json` file in a directory.
5. The `settings.json` file in the `.fusebit` subdirectory of the current or closest parent directory.

The EveryAuth CLI is always looking for credentials in the `~/.fusebit/settings.json` file created when you run `everyauth init`. You can copy the `~/.fusebit` directory between machines to access the same underlying account. 

## Identity mapping

One of the features of EveryAuth is the durable and secure storage of your users' _identities_. You can retrieve those identities using _tags_ representing concepts native to your app. For example, a user ID, a project ID, or a tenant ID.

To enable looking up identities using tags, you must first associate a tag with an identity. Fusebit defines two types of commonly used tags: _fusebit.userId_, and _fusebit.tenantId_. You can associate an identity with those tags as part of the EveryAuth middleware configuration:

```javascript
router.use(
  "/slack",
  everyauth.authorize("slack", {
    mapToUserId: async (req) => "user-123",
    mapToTenantId: async (req) => "company-contoso",
  })
);
```

The `mapToUserId` is a customization point you need to override to set the value of the _fusebit.userId_ tag for the identity that is established in the authorization process (in the example above, to Slack). This value would be typically derived from the authentication mechanism you are using to protect the endpoint above. For example, it could come from a cookie-based session.

The `mapToTenantId` is used to set the value of the _fusebit.tenantId_ tag for the new identity. The concept of a tenant is specific to your application. For example, the specific authenticated user of your app may be part of a particular company or organization which is the tenant of your app. If you don't provide an explicit value for the _fusebit.tenantId_ tag, its value will be the same value you provided for _fusebit.userId_.

Once the authorization process completes, the resulting identity is durably and securely stored by EveryAuth and associated with the respective tags. Later on in your app, you can look up the identity using the value of the _fusebit.userId_ tag:

```javascript
const userId = "user-123";
const slackCredentials = everyauth.getIdentity("slack", userId);
```

You can also look up an identity that has multiple tags:

```javascript
const slackCredentials = everyauth.getIdentity("slack", {
  "fusebit.tenantId": "company-contoso",
  "fusebit.userId": "user-123"
});
```

The `getIdentity` function will return exactly one matching identity or _undefined_ if no matching identity is found. An exception will be thrown if there is more than one matching identity.

In cases where you expect multiple identities matching the search criteria (for example, multiple identities with _fusebit.tenantId_ tag set to "company-contoso"), use the `getIdentities` function instead.

## Service configuration

EveryAuth comes with shared OAuth clients to services it supports so that you can get up and running quickly. Those clients have limited permissions. Once the needs of your app exceed those permissions, you will need to create your own OAuth client in the respective service and configure EveryAuth to use it.

Service configuration is performed using the EveryAuth CLI. Documentation of specific services talks about service-specific parameters that need to be set. Still, in a typical case you would need to specify your own _client ID_, _client secret_, and _scope_, for example:

```bash
everyauth service set slack \
  --scope "chat:write users:read channels:read channels:join chat:write.public" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

EveryAuth durably stores the configuration parameters of a service as part of your Fusebit account.

You can check the current configuration of a service with `everyauth service get {name}` and list available services with `everyauth service ls`.

## EveryAuth CLI reference

The EveryAuth CLI manages the configuration of the services you want to authorize from your app. You can install the CLI with:

```bash
npm install -g @fusebit/everyauth-cli
```

Below is a short synopsis of the CLI commands. For detailed options, specify the command name followed by `--help`. 

#### everyauth init

Performs one-time initialization of EveryAuth on a developer machine. This command will create a free Fusebit account and store the credentials necessary to access it in your home directory's `~/.fusebit/settings.json` file. Keep this file secret. You can also move the `.fusebit` directory to a new machine from which you want to access your EveryAuth configuration, like a CI/CD box or a second development machine. 

#### everyauth profile export

Exports to `stdout` a JSON-encoded profile object which can be used with `everyauth profile import`, or
set in the environment after base64 encoding within `EVERYAUTH_PROFILE_JSON` to support generating keys in
production to authenticate to the EveryAuth backend.

**Example:** Encode the profile to generate short-lived JWT keys dynamically in production, and store it in a
`.env` file.

```
echo EVERYAUTH_PROFILE_JSON=`everyauth profile export | base64` >> .env
```

#### everyauth profile import

Supports importing, from `stdin` or a file, a previously existing profile.

#### everyauth token

Generates a token that can be placed within the `EVERYAUTH_TOKEN` environment variable to be automatically
used by the middleware to communicate with the EveryAuth backend.

Supports a `--expires` parameter that allows for a custom expiration time specified via standard
[ms](https://www.npmjs.com/package/ms) interval encoding.  The default expiration interval is `2h` (two hours).

**Example:** Generate a token valid for 12 weeks, and store it in a `.env` file.

```
echo EVERYAUTH_TOKEN=`everyauth token --expires 12w` >> .env
```

#### everyauth service ls

Lists services available to use from your app. See the [Supported services](#supported-services) section for details on the usage of individual services. 

#### everyauth service set

Configures a specific service. This can be used to specify your custom OAuth client ID or secret or a custom set of scopes you want to request the authorization for. See the [Supported services](#supported-services) section for details on the usage of individual services. 

#### everyauth service get

Get the current configuration of a specific service and the OAuth callback URL necessary to set up a custom OAuth application with that service. 

#### everyauth service add

Add a new service. 

#### everyauth service rm

Remove existing service.

#### everyauth service log

Get logs of an existing service. 

#### everyauth identity ls

List existing identities for a specific service (users who authorized your app to use the service on their behalf).

#### everyauth identity get

Get details of a specific identity of a particular service.

#### everyauth identity rm

Remove a specific identity of a particular service. 

#### everyauth version

Display CLI version.

## EveryAuth Express middleware reference

The EveryAuth Express middleware and module can be installed in your Node.js project with:

```bash
npm install @fusebit/everyauth-express --save
```

Below is the synopsis of the methods and types the module offers. 

#### authorize(serviceId, options)

An Express middleware that defines the necessary endpoints on your web application that enable you to take a browser user through an authorization flow for a particular service. To start the flow, you need to direct the browser to the endpoint where this middleware was installed. When authorization flow has finished, control is returned to your application by redirecting to the `finishedUrl` URL you specified in the middleware's configuration. The query parameters of the final redirect indicate the operation status. 

**NOTE** The endpoint you would add this middleware to is typically authenticated using the same mechanisms as other browser-facing endpoints of your app. 

```javascript
import everyauth from "@fusebit/everyauth-express";

router.use(
  // The endpoint you need to redirect the user to to start the authorization flow
  "/slack", 
  // The service you want get the authorization for, in this case Slack
  everyauth.authorize("slack", { 
    // The endpoint of your app where control will be returned afterwards:
    finishedUrl: "/slack/finished", 
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);
```

The `finishedUrl` may receive the following query string parameters on completion:

| name | type | description |
|------|------|-------------|
| `error` | string  (optional) | A short description of the error that occurred, if any. |
| `errorDescription` | string (optional) | A longer description of the error that occurred, if any. |

##### Parameters  <!-- omit in toc -->

| name | type | description |
|------|------|-------------|
| `serviceIdOrFunc` | string&nbsp;\| (req:&nbsp;express.Request)&nbsp;=>&nbsp;Promise<string> | The name of the remote service to get authorization from the user, or a function to extract that from the request. |
| `options` | [EveryAuthOptions](#everyauthoptions) | Options controlling the behavior of the middleware. |

#### getIdentity(serviceId, identityOrIdsOrTags)

Returns the identity of a specific user and service, including the current access token that can be used to call APIs of the service. This method uses search criteria specific to your application (e.g., userId or tenantId) to look up a unique, matching identity in EveryAuth. It also ensures the access token is current and refreshes it if needed. 

If more than one identity matches the search criteria, this method will throw an exception. If there are no matching identities, it will return *undefined*. It will only return an identity if exactly one match is found. 

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Slack credentials of the user of your app
const userId = "user-123"; // req.user.id in production
const slackCredentials = await everyauth.getIdentity("slack", userId);
// Use slackCredentials.accessToken to call the Slack API
});
```

See the [Supported services](#supported-services) section for details on the contents of the return value from `getIdentity`. All return values will have the access token normalized to `userCredentials.accessToken`.  

##### Parameters  <!-- omit in toc -->

| name | type | description |
|------|------|-------------|
| `serviceId` | string | The name of the remote service the user should be authenticated with. |
| `identityOrIdsOrTags` | string&nbsp;\|&nbsp;<br/>Record&lt;string,<br/>&nbsp;&nbsp;string&nbsp;\|<br/>&nbsp;&nbsp;number&nbsp;\|<br/>&nbsp;&nbsp;undefined&nbsp;\|<br/>&nbsp;&nbsp;null<br/>&gt; | If a `string` is supplied, this is treated as either as a unique identity id in the EveryAuth system, or the value of the user id tag.<br/><br/>If the parameter is an object, it is treated as a set of tags the returned identity must have. |

##### Return  <!-- omit in toc -->

Returns an object of type [IEveryAuthCredential](#ieveryauthcredential) with an `accessToken` property guaranteed to be current or `undefined` if no matching identities are found.

#### getIdentities(serviceId, idsOrTags, [options])

Returns all identities matching the specified search criteria. For example, you can query EveryAuth for all service identities that have a specific value of the *fusebit.tenantId*. This method supports paging and continuation. 

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Slack identities of all users from company Contoso
const tenantId = "company-contoso"; 
const identities = await everyauth.getIdentities("slack", { "fusebit.tenantId": tenantId });

for (const item of identities.items) {
  const credentials = await everyauth.getIdentity("slack", item.id);
  // credentials.accessToken
}
```

##### Parameters  <!-- omit in toc -->

| name | type | description |
|------|------|-------------|
| `serviceId` | string | The name of the remote service the user should be authenicated with. |
| `tags` | Record&lt;string,<br/>&nbsp;&nbsp;string&nbsp;\|<br/>&nbsp;&nbsp;number&nbsp;\|<br/>&nbsp;&nbsp;undefined&nbsp;\|<br/>&nbsp;&nbsp;null| A set of tags returned identities must have. |
| `options` | object (optional) | Specify the `next` property as returned by a previous call to `getIdentities` to get a next page of matching identities. Specify the `pageSize` property to indicate the desired maximum number of results to return. |

##### Return  <!-- omit in toc -->

| name | type | description |
-------|------|-------------|
| `items` | [IEveryAuthIdentity](#ieveryauthidentity)[] | An array of EveryAuth credential objects. |
| `next` | string \| undefined | If present, indicates that additional results may be obtained by supplying the `next` parameter to another call to `getIdentities` |

#### EveryAuthOptions

| name | type | description |
|------|------|-------------|
| `finishedUrl` | string | The absolute or relative path to send the user to after completing the authorization flow. |
| `finishedUrlOrFunc` | string&nbsp;\| (req:&nbsp;express.Request)&nbsp;=>&nbsp;Promise<string> | The absolute or relative path to send the user to after completing the authorization flow, or a function to extract that from the request. |
| `mapToUserId` | async&nbsp;(req:&nbsp;[Express.request](https://expressjs.com/en/api.html#req))&nbsp;=>&nbsp;string | This method is called to generate a string user id to identify the user in your system and later allow querying EveryAuth for credentials owned by that user. |
| `mapToTenantId` | async&nbsp;(req:&nbsp;[Express.request](https://expressjs.com/en/api.html#req))&nbsp;=>&nbsp;string | This method is called to generate a string tenant id to identify the tenant in your system, and allow querying EveryAuth for credentials owned by that tenant. If you don't specify this callback, the value of the tenant id will be set to the same value as the user id. |

#### IEveryAuthCredential

| name | type | description |
|------|------|-------------|
| `accessToken` | string | An access token to call the service APIs. The token is guaranteed to be valid. |
| `native` | object | A representation of the security credential native to the service that generated it. See the [Supported services](#supported-services) section for details of a specific service. |
| `fusebit` | object | A collection of values, including the `identityId`, that uniquely identify this
credential. |

#### IEveryAuthIdentity

| name | type | description |
|------|------|-------------|
| `id` | string | A unique string identifying this particular identity that can be used in a call to `getIdentity`. |
| `tags` | object | A set of tags associated with this identity. |
| `dateModified` | string (optional) | The date the identity was last modified. |

## FAQ

#### What problems does EveryAuth solve that OAuth does not?

In addition to abstracting away the OAuth implementation quirks of various APIs, EveryAuth does a few extra things that pure OAuth does not:

- Provides out-of-the-box, shared OAuth clients with basic permissions to get you started quickly.
- Implements durable and secure storage of OAuth credentials of your users so that you don't have to.
- Supports flexible identity mapping to reference credentials using concepts native to your app so that you don't need to touch your databases.
- Implements automatic token refresh when needed.
- Provides proactive monitoring and alerting for expired or revoked credentials (coming soon).

#### Why do I need a Fusebit account?

You need a [Fusebit](https://fusebit.io) account for three reasons:

1. To ensure your users' identities are stored securely and isolated from identities of other apps' users.
1. To ensure your OAuth client configuration is protected.
1. To enable the use of the shared OAuth clients provided by EveryAuth.

#### What is Fusebit anyway?

[Fusebit](https://fusebit.io) is a code-first integration platform that helps developers add integrations to their apps. Authorization to third-party services and management of your users' credentials is a fundamental feature of the platform, which we are making available to developers through EveryAuth. Follow us on Twitter [@fusebitio](https://twitter.com/fusebitio) for great developer content, and check out some cool OSS projects at [github.com/fusebit](https://github.com/fusebit).

#### What if you don't support the service I need?

Please [check if it is already on the roadmap and file an issue if it is not](https://github.com/fusebit/everyauth-express/issues).
