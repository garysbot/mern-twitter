const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const debug = require('debug');

const cors = require('cors');
const csurf = require('csurf');
const { isProduction } = require('./config/keys');

require('./models/User');
require('./models/Tweet'); // <--ADD THIS LINE
require('./config/passport'); // <-- ADD THIS LINE
const passport = require('passport'); // <-- ADD THIS LINE
const usersRouter = require('./routes/api/users');
const tweetsRouter = require('./routes/api/tweets');
const csrfRouter = require('./routes/api/csrf');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(passport.initialize());

// Security Middleware
if (!isProduction) {
  // Enable CORS only in development because React will be on the React
  // development server (http://localhost:3000). (In production, the Express 
  // server will serve the React files statically.)
  app.use(cors());
}

app.use(
  csurf({
    cookie: {
      secure: isProduction,
      sameSite: isProduction && "Lax",
      httpOnly: true
    }
  })
);



app.use('/api/users', usersRouter);
app.use('/api/tweets', tweetsRouter);
app.use('/api/csrf', csrfRouter);

// Serve static React build files statically in production
if (isProduction) {
  const path = require('path');
  // Serve the frontend's index.html file at the root route
  app.get('/', (req, res) => {
    res.cookie('CSRF-TOKEN', req.csrfToken());
    res.sendFile(
      path.resolve(__dirname, '../frontend', 'build', 'index.html')
    );
  });

  // Serve the static assets in the frontend's build folder
  app.use(express.static(path.resolve("../frontend/build")));

  // Serve the frontend's index.html file at all other routes NOT starting with /api
  app.get(/^(?!\/?api).*/, (req, res) => {
    res.cookie('CSRF-TOKEN', req.csrfToken());
    res.sendFile(
      path.resolve(__dirname, '../frontend', 'build', 'index.html')
    );
  });
}

// Express custom middleware for catching all unmatched requests and formatting
// a 404 error to be sent as the response.
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
});

const serverErrorLogger = debug('backend:error');

// Express custom error handler that will be called whenever a route handler or
// middleware throws an error or invokes the `next` function with a truthy value
app.use((err, req, res, next) => {
  serverErrorLogger(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    statusCode,
    errors: err.errors
  })
});


module.exports = app;
