# PagerDuty Application Example

This example assumes you already have EveryAuth configured in your development environment. In case you don’t, follow the [configuration steps](https://github.com/fusebit/everyauth-express#getting-started).

You have an existing Express application that needs to integrate with the PagerDuty API to display the following information.
- User information
- Services within the PagerDuty account

The application will display the authorized user's PagerDuty account profile and the services it's got access to.

# Configuring EveryAuth

A basic Express application that looks like the following:

```js
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'pug');

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

Let's add support to EveryAuth and configure the PagerDuty service so we can interact with their API.

```bash
npm i
```

## Add Routes

There are two critical routes we need to add to our application:

- Authorize route
- Finished route

Let's understand the role of each route:

### Authorize route

EveryAuth middleware enables your application to perform an authorization flow for a particular service. We will be using [PagerDuty](https://github.com/fusebit/everyauth-express/blob/main/docs/pagerduty.md) service to use a PagerDuty application. 

EveryAuth handles authorization by you adding a middleware to the application. You can install the middleware like this:

```javascript
app.use(
  '/authorize/:userId',
  (req, res, next) => {
    if (!req.params.userId) {
      return res.redirect('/');
    }
    return next();
  },
  everyauth.authorize('pagerduty', {
    finishedUrl: '/finished',
    mapToUserId: (req) => req.params.userId,
  })
);
```

## Handler

Next, you need to build a handler to be call back to after the authorization is processed, in the above code, we defined it to be `/finished`. So here, we want to add a `/finished` route to get the PagerDuty credentials and use it to call different APIs, add this to your code:

```javascript
app.get('/finished', handleSession, async (req, res) => {
  const creds = await everyauth.getIdentity('pagerduty', req.session.userId);
  const sdk = api({ token: creds.accessToken, tokenType: 'bearer' });
  const services = await (await sdk.get('/services')).resource;
  const me = await (await sdk.get('/users/me')).data.user;
  res.render('index', {
    title: 'Welcome to EveryAuth PagerDuty Demo App!',
    name: me.name,
    avatar_url: me.avatar_url,
    svcs: services,
  });
});
```

This also need a small middleware - handleSession, add this to your code:

```javascript
const handleSession = (req, res, next) => {
  if (req.query.userId) {
    req.session.userId = req.query.userId;
  }

  if (!req.session.userId) {
    return res.redirect('/');
  }

  return next();
};
```