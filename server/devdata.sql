INSERT INTO account (id, email, name) VALUES (1, 'copyraptor@copyraptor.com', 'Copyraptor Demo');
INSERT INTO site (sitekey, password, owner) VALUES ('editordemo', crypt('editordemo', gen_salt('bf')), 1);
