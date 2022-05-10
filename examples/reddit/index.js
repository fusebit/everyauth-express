const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');
const snoowrap = require('snoowrap');

const everyauth = require('@fusebit/everyauth-express');

const app = express();
const port = process.env.PORT || 3000;

// Get userId from the authorization redirect or via session if already authorized.
const validateSession = (req, res, next) => {
  if (req.query.userId) {
    req.session.userId = req.query.userId;
  }
  if (!req.session.userId) {
    return res.redirect('/');
  }
  return next();
};

app.use(
  cookieSession({
    name: 'session',
    secret: 'secret',
  })
);

app.set('view engine', 'pug');

app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/authorize/${uuidv4()}`);
  }
  res.redirect('/finished');
});

app.use(
  '/authorize/:userId',
  everyauth.authorize('reddit', {
    // The endpoint of your app where control will be returned afterwards
    finishedUrl: '/finished',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

app.get('/finished', validateSession, async (req, res) => {
  // Get Reddit service credentials.
  const userCredentials = await everyauth.getIdentity('reddit', req.session.userId);

  // Initialize the reddit client with the credentials access token.
  const redditClient = new snoowrap({
    userAgent: 'EveryAuth',
    accessToken: userCredentials.accessToken,
  });

  // Get top 30 user comments sorted by upvotes.
  const topComments = await redditClient.getMe().getComments({ sort: 'top', limit: 30 });

  // Get authorizing user reddit profile.
  const me = await redditClient.getMe();

  // Organize the user profile information to display
  const {
    subreddit: {
      display_name: { banner_img, icon_img, display_name_prefixed },
    },
    name,
    total_karma,
    snoovatar_img,
  } = me;

  // Render the user profile and top comments in views/index.pug
  res.render('index', {
    banner_img,
    icon_img,
    name,
    display_name_prefixed,
    total_karma,
    snoovatar_img,
    topComments,
  });
});

app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`);
});
