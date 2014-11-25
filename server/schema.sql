CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for bcrypt

CREATE TABLE account (
  id SERIAL PRIMARY KEY,
  email VARCHAR(128) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  password VARCHAR(72)
);

CREATE TABLE site (
  sitekey VARCHAR(128) PRIMARY KEY,
  password VARCHAR(72) NOT NULL, -- site-specific password
  owner BIGINT NOT NULL REFERENCES account(id)
);



CREATE OR REPLACE VIEW site_with_owner AS
  SELECT site.sitekey, site.password, account.email, account.name
  FROM site INNER JOIN account ON site.owner = account.id;
