# GitHub

EveryAuth is the easiest way to call GitHub APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding GitHub support to your app.

## Authorize access to GitHub

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to GitHub APIs
router.use(
  "/githuboauth",
  everyauth.authorize("githuboauth", {
    finishedUrl: "/githuboauth/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/githuboauth/finished", (req, res) => {
  res.send("Thank you for authorizing access to GitHub!");
});
```

When you want users of your app to authorize access to GitHub so that your app can call GitHub APIs on their behalf, redirect their browser to the `/githuboauth` endpoint above.

## Call GitHub APIs

After a user has authorized your app to call GitHub APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [octokit](https://www.npmjs.com/package/octokit) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to GitHub credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get GitHub credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("githuboauth", userId);
```

The GitHub credential returned has the following schema:

```javascript
{
  "accessToken": "gho_...", // Current access token to GitHub APIs
  "native": {
    "scope": "public_repo,user", // Scopes that were granted
    "timestamp": 1649809787188, // Time the credential was established
    "access_token": "gho_..." // Current access token to GitHub APIs
  },
}
```

Then, instantiate the GitHub client and make the API calls you want:

```javascript
import { Octokit as Client } from "octokit";

// Create GitHub SDK
const githubClient = new Client({ auth: userCredentials.accessToken });

// Call GitHub API
const { data } = await githubClient.rest.users.getAuthenticated();
```

## Configure GitHub service

The shared GitHub OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call GitHub APIs right away. The following OAuth scopes are included:
* user
* public_repo

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth application in GitHub](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app), and then use the EveyAuth CLI to configure the GitHub service to use it:

```bash
everyauth service set githuboauth \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The octokit npm module](https://www.npmjs.com/package/octokit)  
[Create GitHub OAuth application](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app)  
[Fusebit](https://fusebit.io)
