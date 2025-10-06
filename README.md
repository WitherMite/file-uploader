# Express + PostreSQL Template

## Setup:

Ensure node version is at least v22.17.1 LTS and npm is 11.4.2.

Run `npm install` to install package dependencies.

Create a postgreSQL database and obtain it's connectionURI and if needed, your ssl certification.

Run the populate-db script:  
`npm run populate-db <connectionURI> <optional-path-to-ssl-certificate>`.

Create a .env file and set the variables `DB_URL` and optionally `CA`(as the full certificate string, not filepath).

Run `node app.js` and check http://localhost:3000/ to ensure the environment is setup correctly.
