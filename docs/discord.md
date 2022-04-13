# Discord

EveryAuth is the easiest way to call Discord APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Discord support to your app.

## Authorize access to Discord

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Discord APIs
router.use(
  "/discord",
  everyauth.authorize("discord", {
    finishedUrl: "/discord/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/discord/finished", (req, res) => {
  res.send("Thank you for authorizing access to Discord!");
});
```

When you want users of your app to authorize access to Discord so that your app can call Discord APIs on their behalf, redirect their browser to the `/discord` endpoint above.

## Call Discord APIs

After a user has authorized your app to call Discord APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [superagent](https://www.npmjs.com/package/superagent) npm module to make generic HTTP calls.

First, use EveryAuth to resolve the identifier of the user of your app to Discord credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Discord credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("discord", userId);
```

The Discord credential returned has the following schema:

```javascript
{
  "accessToken": "69...", // Current access token to Discord APIs
  "native": {
    "scope": "identify", // Scopes that were granted
    "webhook": { // The Discord webhook that was registered during the authorization process, if any
      "id": "963595366131974144",
      "url": "https://discord.com/api/webhooks/963595366131974144/1I...",
      "name": "fusebit-discord-demo",
      "type": 1,
      "token": "1I...",
      "avatar": "54c23eb7da17e994faa8dca4c7d9bfe4",
      "guild_id": "852374136687820832",
      "channel_id": "852374137119703051",
      "application_id": "918713218434748416"
    },
    "timestamp": 1649809438178, // Time the credential was established
    "expires_at": 1650414238178, // Time the access tokene expires
    "access_token": "69...", // Current access token to Discord APIs
    "applicationId": "7c..." // Discord application ID
  },
}
```

Then, make the API calls you want using the generic superagent HTTP client:

```javascript
import Superagent from 'superagent';

// Call Discord API
const response = await Superagent
    .get('https://discord.com/api/users/@me')
    .set('Authorization', `Bearer ${userCredentials.accessToken}`);
const me = response.body;
```

## Configure Discord service

The shared Discord OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call Discord APIs right away. The following OAuth scopes are included:
* identify

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth application in Discord](https://discord.com/developers/applications), and then use the EveyAuth CLI to configure the Discord service to use it:

```bash
everyauth service set discord \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The superagent npm module](https://www.npmjs.com/package/superagent)  
[Create Discord OAuth application](https://discord.com/developers/applications)  
[Fusebit](https://fusebit.io)
