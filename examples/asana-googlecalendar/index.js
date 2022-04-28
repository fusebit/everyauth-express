const express = require("express");
const asana = require("asana");
const { google } = require("googleapis");
const everyauth = require("@fusebit/everyauth-express");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const cookieSession = require("cookie-session");
const mustacheExpress = require("mustache-express");

const app = express();
const port = 3000;
const SERVICES = ['asana', 'google'];

app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", __dirname + "/views");
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieSession({ name: "session", secret: "secret" }));

app.get("/", (req, res) => {
  let isSessionComplete = true;

  //Can add a message to say, authorize the specific service!
  SERVICES.forEach((service) => { 
    if(!req.session[`${service}UserId`]) {
      isSessionComplete = false;
    }
  });

  if (isSessionComplete) {
    return res.redirect(`/tasks`);
  }
  return res.render("index", { userId: uuidv4() });
});


SERVICES.forEach((service) => {

  app.use(
    `/${service}/authorize/:userId`,
    everyauth.authorize(service, {
      finishedUrl: `/tasks`,
      mapToUserId: (req) => req.params.userId,
    })
  );

});


// Asana Sign In Flow
// app.use(
//   "/asana/authorize/:userId",
//   everyauth.authorize("asana", {
//     finishedUrl: `/tasks`,
//     mapToUserId: (req) => req.params.userId,
//   })
// );

// // Google Sign In Flow
// app.use(
//   "/google/authorize/:userId",
//   everyauth.authorize("google", {
//     finishedUrl: `/tasks`,
//     mapToUserId: (req) => req.params.userId,
//   })
// );

// Get userId from the authorization redirect or via session if already authorized.
const handleSession = (req, res, next) => {

  // 1. Handle authorization callback (set a session)

  if (req.query.userId) {
    const serviceName = req.query.serviceId;
    if (!serviceName) {
      return res.redirect(`/`);
    }
    req.session[`${serviceName}UserId`] = req.query.userId;
  }

  return next();
};


const ensureSession = (req, res, next) => {

  SERVICES.forEach((service) => {

    if (!req.session[`${service}UserId`]) {
      return res.redirect(`/${service}/authorize/${req.query.userId}`);
    }

  });

  next();
};

app.get("/tasks", handleSession, ensureSession, async (req, res) => {
  // Retrieve an always fresh access token using userId
  //console.log(req.body);
  const asanaCredentials = await everyauth.getIdentity(
    "asana",
    req.session.asanaUserId
  );

  // Call Asana API
  const asanaClient = asana.Client.create().useAccessToken(
    asanaCredentials.accessToken
  );

  const me = await asanaClient.users.me();
  const workspace = me.workspaces[0].gid;
  const assignee = me.gid;

  const tasks = await asanaClient.tasks.getTasks({ workspace, assignee });

  const taskGIDs = tasks.data.map((tasks) => ({
    taskGID: tasks.gid,
  }));

  const taskDetails = [];
  for (const gid of taskGIDs) {
    const task = await asanaClient.tasks.getTask(gid.taskGID);
    taskDetails.push({
      taskName: task.name,
      taskNotes: task.notes,
      taskDueDate: task.due_on,
    });
  }
  // console.log({ TaskListData: taskDetails });

  // Retrieve an always fresh access token using userId
  const googleCredentials = await everyauth.getIdentity(
    "google",
    req.session.googleUserId
  );

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: googleCredentials.accessToken });
  google.options({ auth: myAuth });

  const calendar = google.calendar({ version: "v3" });
  const calendarEvents = await calendar.events.list({
    auth: myAuth,
    calendarId: "primary",
    timeMin: new Date(),
  });

  const calendarEventsList = calendarEvents.data.items.map((calendarItem) => {
    // Google Calendar API Returns Inconsistent Start Times
    // So this is a workaround to handle the data and normalize it
    var startTimeFromNow = "";
    if (!calendarItem.start) {
      startTimeFromNow = "";
    } else if (calendarItem.start.dateTime) {
      startTimeFromNow = moment(calendarItem.start.dateTime).fromNow();
    } else if (calendarItem.start.date) {
      startTimeFromNow = moment(calendarItem.start.date).fromNow();
    }
    return {
      summary: calendarItem.summary,
      description: calendarItem.description,
      startTime: startTimeFromNow,
    };
  });

  //console.log({ TaskListData: taskDetails, calendarEventsList });

  res.render("tasklist", { TaskListData: { taskDetails, calendarEventsList } });

});


// Add a new event to a calendar by ID
app.post('/tasks/calendar/', handleSession, async (req, res) => {
  // Retrieve access token using userId from session
  const userCredentials = await everyauth.getIdentity('google', req.session.googleUserId);

  // Retrieve QuickAddText or use a Default Fallback
  const quickAddText = req.body.quickadd || 'New Event Added by Fusebit for Tomorrow at Noon';
  console.log(quickAddText);

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: userCredentials.accessToken });
  google.options({ auth: myAuth });

  // Quick Add a New Event
  const calendar = google.calendar({ version: 'v3' });
  const addQuickEvent = await calendar.events.quickAdd({
    auth: myAuth,
    calendarId: 'primary',
    text: quickAddText,
  });

  res.redirect(`/tasks`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
