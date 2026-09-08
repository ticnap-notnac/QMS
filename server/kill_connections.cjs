const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.PG_BOSS_DATABASE_URL
});

client.connect().then(() => {
  return client.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'postgres' AND pid != pg_backend_pid();");
}).then(res => {
  console.log('Terminated connections:', res.rowCount);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
