const { Pool } = require("pg");
const connectionString = process.env.DB_URL;
const ca = process.env.CA;

const config = ca
  ? {
      connectionString,
      ssl: {
        rejectUnauthorized: true,
        ca,
      },
    }
  : { connectionString };

module.exports = new Pool(config);
