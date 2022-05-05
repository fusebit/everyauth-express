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

const stackOverflowApi = ({ access_token, client_key }) => {
  return async (path, extraParams = {}) => {
    const url = new URL(`https://api.stackexchange.com/2.3/${path}`);
    url.searchParams.append('key', client_key);
    url.searchParams.append('access_token', access_token);
    url.searchParams.append('site', 'stackoverflow');
    Object.keys(extraParams).forEach((key) => url.searchParams.append(key, extraParams[key]));
    return await superagent.get(url.toString());
  };
};

app.get('/finished', validateSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity('stackoverflow', req.session.userId);
  const { client_key, access_token } = userCredentials.native;
  const stackOverflowRequest = stackOverflowApi({ access_token, client_key });
  const meResponse = await stackOverflowRequest('me');
  const userInfo = JSON.parse(meResponse.text);
  const user = userInfo.items[0];
  const currentUserAnswers = await stackOverflowRequest(`users/${user.user_id}/answers`, {
    pagesize: 10,
    order: 'desc',
    sort: 'votes',
    filter: '!*MZqiH2sG_JWt3xD',
  });
  const answers = JSON.parse(currentUserAnswers.text);
  const currentUserQuestions = await stackOverflowRequest(`users/${user.user_id}/questions`, {
    pagesize: 10,
    order: 'desc',
    sort: 'votes',
  });
  // Fetch top questions and top answers.
  const questions = JSON.parse(currentUserQuestions.text);
  res.render('index', {
    user,
    questions: questions.items,
    answers: answers.items,
    page: '/stack-overflow-top',
    pageTitle: 'View Top Global data',
  });
});

app.get('/stack-overflow-top', validateSession, async (req, res) => {
  const userCredentials = await everyauth.getIdentity('stackoverflow', req.session.userId);
  const { client_key, access_token } = userCredentials.native;
  const stackOverflowRequest = stackOverflowApi({ access_token, client_key });
  const meResponse = await stackOverflowRequest('me');
  const userInfo = JSON.parse(meResponse.text);
  const user = userInfo.items[0];
  const topQuestionsResponse = await stackOverflowRequest('questions', {
    pagesize: 10,
    order: 'desc',
    sort: 'votes',
    filter: '!nKzQUR3Ecy',
  });
  const questions = JSON.parse(topQuestionsResponse.text);
  console.log(questions);
  const topAnswersResponse = await stackOverflowRequest('answers', {
    pagesize: 10,
    order: 'desc',
    sort: 'votes',
    filter: '!*MZqiH2sG_JWt3xD',
  });
  const answers = JSON.parse(topAnswersResponse.text);

  res.render('index', {
    user,
    questions: questions.items,
    answers: answers.items,
    page: '/',
    pageTitle: 'View your data',
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
