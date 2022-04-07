# GitLab

EveryAuth is the easiest way to call GitLab APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding GitLab support to your app.

## Authorize access to GitLab

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to GitLab APIs
router.use(
  "/gitlab",
  everyauth.authorize("gitlab", {
    finishedUrl: "/gitlab/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/gitlab/finished", (req, res) => {
  res.send("Thank you for authorizing access to GitLab!");
});
```

When you want users of your app to authorize access to GitLab so that your app can call GitLab APIs on their behalf, redirect their browser to the `/gitlab` endpoint above.

## Call GitLab APIs

After a user has authorized your app to call GitLab APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [@gitbeaker/node](https://www.npmjs.com/package/@gitbeaker/node) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to GitLab credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get GitLab credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("gitlab", userId);
```

Then, instantiate the GitLab client and make the API calls you want:

```javascript
import { Gitlab } from '@gitbeaker/node';

// Create GitLab SDK
const gitlabClient = new GitLab({ oauthToken: userCredentials.accessToken });

// Call GitLab API
const { name, username } = await gitlabClient.Users.current();
const projects = await gitlabClient.Projects.all({ membership: true });
```

## Configure GitLab service

The shared GitLab OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call GitLab APIs right away. The following OAuth scopes are included:
* read_user
* read_api

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth application in GitLab](https://docs.gitlab.com/ee/integration/oauth_provider.html), and then use the EveyAuth CLI to configure the GitLab service to use it:

```bash
everyauth service set gitlab \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The @gitbeaker/node npm module](https://www.npmjs.com/package/@gitbeaker/node)  
[Create GitLab OAuth application](https://docs.gitlab.com/ee/integration/oauth_provider.html)  
[Fusebit](https://fusebit.io)
