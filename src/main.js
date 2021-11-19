const express = require('express');
const path = require('path')
const app = express();
const port = 3000;
const SHA256 = require('crypto-js/sha256');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const {
  generateAuthToken, requireAuth, discoverAuthCookie, authTokens,
} = require('./libraries/user_auth_handlers.js');
const {
  userNameExists, emailExists, scheduleChecker, dayNums,
} = require('./libraries/handlers.js');

const db = new Pool();

db.connect();

app.set('views', './src/views');
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(discoverAuthCookie);
app.use(express.static(path.join(__dirname, 'assets')))

// ----GET REQUESTS------------------------------
app.get('/', requireAuth, (req, res) => {
  res.redirect('schedules');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/logout', requireAuth, (req, res) => {
  res.clearCookie('AuthToken');
  delete authTokens[req.cookies.AuthToken];
  res.render('login', { message: 'You have been logged out' });
});

app.get('/schedules', requireAuth, (req, res) => {
  db.query('SELECT * FROM schedules ORDER BY day', (dbErr, dbRes) => {
    res.render('schedules', { schedules: dbRes.rows, dayNums });
  });
});

app.get('/schedules/new', requireAuth, (req, res) => {
  res.render('new_schedule');
});

app.get('/users', requireAuth, (req, res) => {
  db.query('SELECT * FROM users', (dbErr, dbRes) => {
    res.render('users', { users: dbRes.rows });
  });
});

app.get('/users/:users', requireAuth, (req, res) => {
  db.query(`SELECT * FROM users WHERE user_name = '${req.params.users}'`, (dbErr, dbRes) => {
    if (dbRes.rows[0] === undefined) {
      res.status(404).send(`Sorry cannot find the user with user_name: ${req.params.users}`);
    } else {
      res.render('user', { user: dbRes.rows[0] });
    }
  });
});

app.get('/users/:users/schedule', requireAuth, async (req, res) => {
  if (!await userNameExists(req.params.users, db)) {
    res.status(404).send(`Sorry cannot find the schedule for the user_name: ${req.params.users}`);
  } else {
    db.query(`SELECT users.user_name, first_name, last_name, day, start_at, end_at 
            FROM users 
            JOIN schedules ON users.user_name = schedules.user_name
            where users.user_name = '${req.params.users}'`, (dbErr, dbRes) => {
      if (dbRes.rows[0] === undefined) {
        res.status(404).send(`The schedule for user ${req.params.users} is empty`);
      } else {
        res.render('userschedule', { user: dbRes.rows[0], dayNums, userSchedule: dbRes.rows });
      }
    });
  }
});

// ----POST REQUESTS------------------------------

app.post('/login', async (req, res) => {
  if (Object.values(req.body).join('') === '') {
    res.status(404).send('no data');
  } else if (await userNameExists(req.body.user_name, db)) {
    res.status(406).send('username already exist');
  } else if (req.body.email === '') {
    res.status(406).send('no mail');
  } else if (await emailExists(req.body.email, db)) {
    res.status(406).send('email already exist');
  } else if (req.body.password !== req.body.password_confirm) {
    res.status(406).send('password does not match');
  } else {
    req.body.password = SHA256(req.body.password).toString();
    const newUser = {
      user_name: req.body.user_name,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      password: req.body.password,
    };
    const q = `INSERT INTO 
          users (user_name, first_name, last_name, email, password) 
          VALUES 
          ('${newUser.user_name}', '${newUser.first_name}', '${newUser.last_name}', '${newUser.email}','${newUser.password}')`;

    db.query(
      q,
      (dbErr, dbRes) => {
        res.render('login', { message: 'Registration completed' });
      },
    );
  }
});

app.post('/', async (req, res) => {
  const { email, password } = req.body;
  const passwordHashed = SHA256(password).toString();
  const user = await db.query(`SELECT EXISTS (SELECT 1 FROM users WHERE email='${email}' AND password='${passwordHashed}')`);

  if (!user.rows[0].exists) {
    res.render('login', { message: 'Invalid username or password' });
    return;
  }

  const token = generateAuthToken();
  authTokens[token] = user;
  res.cookie('AuthToken', token);
  res.redirect('schedules');
});

app.post('/schedules', requireAuth, async (req, res) => {
  const newSchedule = {
    user_name: req.body.user_name,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    day: req.body.day,
    start_at: req.body.start_at,
    end_at: req.body.end_at,
  };

  req.body.day = Number(req.body.day);
  if ((Object.values(req.body)).includes('')) {
    res.status(404).send('no data');
    return;
  }

  if (!await userNameExists(newSchedule.user_name, db)) {
    res.status(404).send('user doesn\'t exist');
    return;
  }

  if (!await scheduleChecker(newSchedule, db)) {
    res.status(406).send('term unavailable');
  }
  const q = `INSERT INTO 
          schedules (user_name, day, start_at, end_at) 
          VALUES 
          ('${newSchedule.user_name}', '${newSchedule.day}','${newSchedule.start_at}', '${newSchedule.end_at}')`;

  db.query(
    q,
    (dbErr, dbRes) => {
      res.redirect('schedules');
    },
  );
});

// ----START SERVER-------------------------------
app.listen(port, () => {
  console.log('Start server!');
});
