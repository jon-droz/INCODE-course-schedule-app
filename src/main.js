const express = require('express');
//const func = require('./library.js');
const app = express();
const port = 3000;
const func = require('./libraries/handlers.js');
const {generateAuthToken, requireAuth, discoverAuthCookie, authTokens} = require('./libraries/user_auth_handlers.js');


//const dbReq = require("./db_req_library.js")
const SHA256 = require('crypto-js/sha256');
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');

const { Client } = require('pg');

const db = new Client({
  database: 'schedule_app',
  user: 'schedules_user',
  password: 'schedules_pass',
  host: 'localhost',
  port: 5432,
});

db.connect();

app.set('views', './src/views');
app.set('view engine', 'pug');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser())
app.use(discoverAuthCookie);

//----GET REQUESTS------------------------------
app.get('/', requireAuth, (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/logout',requireAuth, (req, res) => {
    res.clearCookie('AuthToken');
    delete authTokens[req.cookies['AuthToken']];
    res.render('login', { message: 'You have been logged out' });
});

app.get('/schedules/new', (req, res) => {
    res.render('new_schedule');
  });

//----POST REQUESTS------------------------------

app.post('/login', async (req, res) => {
    
    if (Object.values(req.body).join('') === '') {
      res.status(406).send('no data');
    } else if (await func.userNameExists(req.body.user_name, db)) {
      res.status(406).send('username already exist');
    } else if (req.body.email === '') {
      res.status(406).send('no mail');
    } else if (await func.emailExists(req.body.email, db)) {
      res.status(406).send('email already exist');
    } else if (req.body.password !== req.body.password_confirm) {
      res.status(406).send('password does not match')
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
      passwordHashed = SHA256(req.body.password).toString();
      const user = await db.query(`SELECT EXISTS (SELECT 1 FROM users WHERE email='${email}' AND password='${passwordHashed}')`);
      
      if(!user.rows[0].exists) {
          res.render('login', { message:'Invalid username or password'})
          return;
      }

    const token = generateAuthToken();
    authTokens[token] = user;
    res.cookie('AuthToken', token);
    res.render('index')
  })


//----START SERVER-------------------------------
app.listen(port, () => {
    console.log('Start server at http://localhost:3000!');
  });