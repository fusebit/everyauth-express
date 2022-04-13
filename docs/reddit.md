# Reddit

EveryAuth is the easiest way to call Reddit APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Reddit support to your app.

## Authorize access to Reddit

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Reddit APIs
router.use(
  "/reddit",
  everyauth.authorize("reddit", {
    finishedUrl: "/reddit/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/reddit/finished", (req, res) => {
  res.send("Thank you for authorizing access to Reddit!");
});
```

When you want users of your app to authorize access to Reddit so that your app can call Reddit APIs on their behalf, redirect their browser to the `/reddit` endpoint above.

## Call Reddit APIs

After a user has authorized your app to call Reddit APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [snoowrap](https://www.npmjs.com/package/snoowrap) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to Reddit credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Reddit credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("reddit", userId);
```

The Reddit credential returned has the following schema:

```javascript
{
  "accessToken": "13...", // Current access token to Reddit APIs
  "native": {
    "scope": "read identity", // Scopes that were granted
    "timestamp": 1649893864701, // Time the credential was established
    "expires_at": 1649980264701, // Time the access token expires
    "access_token": "13..." // Current access token to Reddit APIs
  },
}
```

Then, instantiate the Reddit client and make the API calls you want:

```javascript
import snoowrap from 'snoowrap';

// Call Reddit API
const redditClient = new snoowrap({
  userAgent: 'EveryAuth',
  accessToken: userCredentials.accessToken,
});

const me = await redditClient.getMe();
```

## Configure Reddit service

The shared Reddit OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call Reddit APIs right away. The following OAuth scopes are included:
* read
* identity

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in Reddit](https://redditclient.readthedocs.io/en/latest/oauth/), and then use the EveyAuth CLI to configure the Reddit service to use it:

```bash
everyauth service set reddit \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The snoowrap npm module](https://www.npmjs.com/package/snoowrap)  
[Create Reddit OAuth client](https://redditclient.readthedocs.io/en/latest/oauth/)  
[Fusebit](https://fusebit.io)
