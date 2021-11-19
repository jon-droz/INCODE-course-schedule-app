const dayNums = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
};

async function userNameExists(username, database) {
  const dbRes = await database.query(
    `SELECT EXISTS( SELECT 1 FROM users WHERE user_name = '${username}')`,
  );

  const exists = Object.values(dbRes.rows[0])[0];
  return exists;
}

async function emailExists(email, database) {
  const dbRes = await database.query(
    `SELECT EXISTS( SELECT 1 FROM users WHERE email = '${email}')`,
  );

  const exists = Object.values(dbRes.rows[0])[0];
  return exists;
}

async function scheduleChecker(newTerm, db) {
  let available;

  const dbRes = await db.query(`SELECT * from schedules
    WHERE user_name = '${newTerm.user_name}' AND
    day = '${newTerm.day}' AND NOT
    (end_at <= '${newTerm.start_at}' OR start_at >= '${newTerm.end_at}')`);

  if (dbRes.rows.length === 0) {
    available = true;
  } else {
    available = false;
  }
  return available;
}

module.exports = {
  userNameExists, emailExists, scheduleChecker, dayNums,
};
