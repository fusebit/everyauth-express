# EveryAuth

EveryAuth is the easiest way to call third party APIs from your app without learning OAuth.

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

EveryAuth consists of Express middleware, a management CLI, and a [Fusebit](https://fusebit.io) service.

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

Then, create a free [Fusebit](https://fusebit.io) account so that you can use the shared Slack OAuth client. In the root directory of your Express application, run:

```bash
everynode init
```

The command will create the `.fusebit` directory with details of your Fusebit account, including a generated private key. Do not commit this directory to your source control! If you are using Git, add .fusebit to your .gitignore.

Then, add the EveryAuth Express middleware dependency to your app:

```bash
npm install --save @fusebit/everyauth-express
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

  // Use the Node.js Slack client to send a message to
  // the user's Slack workspace
  const slack = new WebClient(slackCredentials.accessToken);
  const result = await slack.chat.postMessage({
    text: "Hello world from EveryAuth!",
    channel: "#general",
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
[LinkedIn](docs/linkedin.md)  
[PagerDuty](docs/pagerduty.md)  
[Quickbooks](docs/quickbooks-online.md)  
[Reddit](docs/reddit.md)  
[Salesforce](docs/sfdc.md)  
[Slack](docs/slack.md)  
[StackOverflow](docs/stackoverflow.md)  
[Twitter](docs/twitter.md)  
[Zoom](docs/zoom.md)

Don't see the service you are looking for? We are constantly adding support for new services. [Check if yours is in the backlog or file a request for one](https://github.com/fusebit/everyauth-express/issues).

## Concepts

- **User** - A person using your web application. This could be you, your friends, or your customers.
- **Tenant** - A large multi-user system uses a concept of a _tenant_ to identify the larger organization a particular _user_ may belong to. For example, your _user_ might be Janet, but the _tenant_ might be Sonicity, a large multinational corporation. Generally, _users_ authenticate on behalf of _tenants_, though for single-user environments the _user_ and the _tenant_ might be effectively the same.
- **Service** - A service is a remote SaaS your users are already using, upon which you would like to act on their behalf. For example, your application may modify a HubSpot record, send a message to Slack, or update a Salesforce company on behalf of your application users.
- **Identity** - The necessary tokens, refresh tokens, or other secrets that are used to authorize API calls to a _service_ on behalf of a _user_.
- **Tag** - A key-value pair, for example ("userId", "user-123"). A number of tags can be associated with an _identity_. EveryAuth enables you to look up an _identity_ or _identities_ that are associated wth a specific set of _tags_.

## Authentication

EveryAuth CLI and middleware communicate with the Fusebit APIs to do their job, and need to authorize those calls. The credentials to do so are established when you run `everyauth init` and stored in the `.fusebit/settings.json` file on disk.

Both the CLI and express middleware locate credentials in a similar manner, in priorty order:

1. Command line options to the CLI or programmatically in code.
1. Base64-encoded JSON in the `EVERYAUTH_ACCOUNT_JSON` environment variable.
1. The `settings.json` file in a directory pointed to by the `EVERYAUTH_ACCOUNT_PATH` environment variable.
1. The `settings.json` file in the `.fusebit` subdirectory of the current directory or closest parent directory.

## Identity mapping

One of the features of EveryAuth is durable and secure storage of your users' _identities_. You can retrieve those identities at any point using _tags_ representing concepts native to your app, for example a user ID, a project ID, or a tenant ID.

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

The `mapToTenantId` is used set the value of the _fusebit.tenantId_ tag for the new identity. This value could be implied by your application model and authentication context. For example, the specific authenticated user of your app may be part of a given company or organization who is the tenant of you app.

The tag concept is extensible - you can define any tags that make sense to you, and associate them with identities using the more advanced `onAuthorized` callback:

```javascript
router.use(
  "/slack",
  everyauth.authorize("slack", {
    onAuthorized: async (res, res, ctx) => {
      ctx.identity.tags = {
        "fusebit.userId": "user-123",
        "fusebit.tenantId": "company-contoso",
        subscriptionLevel: "gold",
      };
    },
  })
);
```

Once the authorization process completes, the resulting identity is durably and securely stored by EveryAuth and associated with the respective tags. Later on in your app, you can look up the identity using the value of the _fusebit.userId_ tag:

```javascript
const userId = "user-123";
const slackCredentials = everyauth.getIdentity("slack", userId);
```

You can also look up an identity that has multiple tags:

```javascript
const slackCredentials = everyauth.getIdentity("slack", {
  "fusebit.tenantId": "company-contoso",
  role: "project-coordinator",
});
```

The `getIdentity` function will return exactly one matching identity or _undefined_ if no matching identity is found. If there is more than one matching identity, an exception will be thrown.

In cases where you expect multiple identities matching the search critieria (for example, all identities at the _gold_ subscription level), use the `getIdentities` function instead.

## Service configuration

EveryAuth comes with shared OAuth clients to services it supports so that you can get up and running quickly. Those clients have limited permissions. Once the needs of your app exceed those permissions, you will need to create your own OAuth client in the respective service and configure EveryAuth to use it.

Service confguration is performend using the EveryAuth CLI. Documentation of specific services talks about service-specific parameters that need to be set, but in a typical case you would need to specify your own _client ID_, _client secret_, and _scope_, for example:

```bash
everyauth service set slack \
  --scope "chat:write users:read channels:read channels:join chat:write.public" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

Configuration parameters of a service are durably stored by EveryAuth as part of your Fusebit account.

You can check the current configuration of a service with `everyauth service get {name}`, and list available services with `everyauth service ls`.

## EveryAuth CLI reference

TODO

## EveryAuth Express middleware reference

TODO

## FAQ

#### What problems does EveryAuth solve that OAuth does not?

In addition to abstrating away the OAuth implementation quirks of various APIs, EveryAuth does a few extra things that pure OAuth does not:

- Provides out of the box, shared OAuth clients with basic permissions to get you started quickly.
- Implements durable and secure storage of OAuth credentials of your users so that you don't have to.
- Suports flexible identity mapping to reference credentials using concepts native to your app, so that you don't need to touch your databases.
- Implements automatic token refresh when needed.
- Provides proactive monitoring and alerting for expired or revoked credentials (coming soon).

#### Why do I need a Fusebit account?

You need a [Fusebit](https://fusebit.io) account for three reasons:

1. To ensure your users' identities are stored securely and isolated from identities of other apps' users.
1. To ensure your OAuth client configuration is protected.
1. To enable the use of the shared OAuth clients provided by Everynode.

#### What is Fusebit anyway?

[Fusebit](https://fusebit.io) is a code-first integration platform that helps developers add integrations to their apps. Authorization to third party services and management of your users' credentials is a fundamental feature of the platform which we are making available to developers through EveryAuth. Follow us on Twitter [@fusebitio](https://twitter.com/fusebitio) for great developer content, and check out some cool OSS projects at [github.com/fusebit](https://github.com/fusebit).

#### What if you don't support the service I need?

Please [check if it is alreday on the roadmap and file an issue if it is not](https://github.com/fusebit/everyauth-express/issues).
