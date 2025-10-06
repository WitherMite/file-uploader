#! /usr/bin/env node
const { Client } = require("pg");
const fs = require("fs");
const connectionURI = process.argv[2];
const caPath = process.argv[3];
const certificate = caPath ? fs.readFileSync(caPath).toString() : false;

// change to run any db setup queries needed
const SQL = `
CREATE TABLE IF NOT EXISTS test (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  value VARCHAR ( 255 )
);

INSERT INTO test (value) 
VALUES
  ('1'),
  ('foo'),
  ('bar');
`;

async function main() {
  console.log("seeding...");
  const config = certificate
    ? {
        connectionString: connectionURI,
        ssl: {
          rejectUnauthorized: true,
          ca: certificate,
        },
      }
    : { connectionString: connectionURI };
  const client = new Client(config);
  await client.connect();
  await client.query(SQL);
  await client.end();
  console.log("done");
}

main();
