const express = require('express');
const superagent = require('superagent');
const { v4: uuidv4 } = require('uuid');
const cookieSession = require('cookie-session');

const everyauth = require('@fusebit/everyauth-express');

const app = express();
const port = 3000;

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
  everyauth.authorize('stackoverflow', {
    // The endpoint of your app where control will be returned afterwards
    finishedUrl: '/finished',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

/**
 * StackOverflow REST API wrapper used to perform authorized GET requests.
 */
const stackOverflowApi = ({ access_token, client_key }) => {
  return async (path, extraParams = {}) => {
    const url = new URL(`https://api.stackexchange.com/2.3/${path}`);
    url.searchParams.append('key', client_key);
    url.searchParams.append('access_token', access_token);
    url.searchParams.append('site', 'stackoverflow');
    Object.keys(extraParams).forEach((key) => url.searchParams.append(key, extraParams[key]));
    const response = await superagent.get(url.toString());
    return JSON.parse(response.text);
  };
};

/**
 * Display Top 10 StackOverflow Questions and Answers of all time for the authorizing user
 */
app.get('/finished', validateSession, async (req, res) => {
  // Get StackOverflow service credentials.
  const userCredentials = await everyauth.getIdentity('stackoverflow', req.session.userId);
  const { client_key, access_token } = userCredentials.native;

  // Configure a StackOverflow API request with the authorizing access token and client key.
  // These values are provided in the token response from the StackOverflow API.
  const stackOverflowRequest = stackOverflowApi({ access_token, client_key });

  // Get the current authorizing user profile information
  const userInfo = await stackOverflowRequest('me');
  const user = userInfo.items[0];

  // Get top 10 user answers, it uses a custom filter to get the answer body.
  // This custom filter was created at https://api.stackexchange.com/docs/answers
  const answers = await stackOverflowRequest(`users/${user.user_id}/answers`, {
    pagesize: 10,
    order: 'desc',
    sort: 'votes',
    filter: '!*MZqiH2sG_JWt3xD',
  });

  // Get top 10 user questions, it uses a custom filter to get the question body.
  // Read more about this API at https://api.stackexchange.com/docs/questions
  const questions = await stackOverflowRequest(`users/${user.user_id}/questions`, {
    pagesize: 10,
    order: 'desc',
    sort: 'votes',
  });

  res.render('index', {
    user,
    questions: questions.items,
    answers: answers.items,
    page: '/stack-overflow-top',
    pageTitle: 'View Top Global data',
  });
});

/**
 * Display Top 10 StackOverflow Questions and Answers of all time.
 */
app.get('/stack-overflow-top', validateSession, async (req, res) => {
  // Get StackOverflow service credentials.
  const userCredentials = await everyauth.getIdentity('stackoverflow', req.session.userId);
  const { client_key, access_token } = userCredentials.native;

  // Configure a StackOverflow API request with the authorizing access token and client key.
  // These values are provided in the token response from the StackOverflow API.
  const stackOverflowRequest = stackOverflowApi({ access_token, client_key });

  // Get the current authorizing user profile information
  const userInfo = await stackOverflowRequest('me');
  const user = userInfo.items[0];

  // Get global top 10 questions from StackOverflow. It uses a custom filter to get the question body.
  // This custom filter was created at https://api.stackexchange.com/docs/questions
  const questions = await stackOverflowRequest('questions', {
    pagesize: 10,
    order: 'desc',
    sort: 'votes',
    filter: '!nKzQUR3Ecy',
  });

  // Get top 10 user answers, it uses a custom filter to get the answer body.
  // This custom filter was created at https://api.stackexchange.com/docs/answers
  const answers = await stackOverflowRequest('answers', {
    pagesize: 10,
    order: 'desc',
    sort: 'votes',
    filter: '!*MZqiH2sG_JWt3xD',
  });

  res.render('index', {
    user,
    questions: questions.items,
    answers: answers.items,
    page: '/',
    pageTitle: 'View your data',
  });
});

app.listen(port, () => {
  console.log(`Example app listening on http://localhost:${port}`);
});
