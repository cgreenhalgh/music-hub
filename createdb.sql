CREATE DATABASE musichub
  DEFAULT CHARACTER SET utf8
  DEFAULT COLLATE utf8_general_ci;

-- musichub webserver mysql account (with limited access, e.g. can't change schema)
CREATE USER musichub IDENTIFIED WITH mysql_native_password BY 'd2R4dWPtPN4zDIOsUvUyN67Tx98Wo5pu';
GRANT DELETE,INSERT,EXECUTE,SELECT,UPDATE ON musichub.* TO 'musichub';

USE musichub;

-- accounts
CREATE TABLE musichub.account (
	id smallint unsigned not null auto_increment, 
	email varchar(100) not null,
	passwordhash varchar(100) not null,
	nickname varchar(100) not null,
	description varchar(200),
	constraint pk_account primary key (id) 
);

-- default musichub user account 
INSERT INTO musichub.account (id, email, passwordhash, nickname, description)
  VALUES ( 1, 'root@musichub', 'Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas', 'Hub admin', 'default hub admin account' );

-- works
CREATE TABLE musichub.work (
	id smallint unsigned not null auto_increment, 
	title varchar(200) not null,
	year char(4) not null,
	version varchar(200),
	composer varchar(200),
	description text,
	constraint pk_work primary key (id) 
);

-- TODO downloads

-- Climb! work
INSERT INTO musichub.work (id, title, year, version, composer, description) 
  VALUES ( 1, 'Climb!', '2017', null, 'Maria Kallionpaa', 'An classical work for Disklavier and electronics inspired by a computer game.' );

-- performances
CREATE TABLE musichub.performance (
	id smallint unsigned not null auto_increment, 
	workid smallint unsigned not null,
	title varchar(200) not null,
	description TEXT,
	performer_title VARCHAR(200) NOT NULL,
	performer_bio TEXT,
	venue_title VARCHAR(200) NOT NULL,
	date DATE,
	time TIME,
	timezone VARCHAR(20),
	public TINYINT NOT NULL DEFAULT 0,
	status VARCHAR(20) NOT NULL,
	linked_performanceid SMALLINT UNSIGNED,
	PRIMARY KEY (id),
	FOREIGN KEY (workid) REFERENCES musichub.work(id),
	FOREIGN KEY (linked_performanceid) REFERENCES musichub.performance(id)
);

-- TODO integrations
-- TODO audio/video recordings
-- TODO log files

-- Climb! all your bass performance 1
INSERT INTO musichub.performance (id, workid, title, performer_title, venue_title, date, time, timezone, public, status )
  VALUES (1, 1, 'Climb! at All Your Bass', 'Anne Veinberg', 'Nottingham Royal Concert Hall', '2018-01-19', '18:30:00', '+0:00', 0, 'CONFIRMED');

INSERT INTO musichub.performance (id, workid, title, performer_title, venue_title, date, time, timezone, public, status, linked_performanceid )
  VALUES (2, 1, 'Climb! at All Your Bass (2)', 'Zubin Kanga', 'Nottingham Royal Concert Hall', '2018-01-19', '19:00:00', '+0:00', 0, 'CONFIRMED', 1);

-- role assignments
CREATE TABLE musichub.role (
	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
	accountid SMALLINT UNSIGNED NOT NULL,
	role VARCHAR(20) NOT NULL,
	workid SMALLINT UNSIGNED,
	performanceid SMALLINT UNSIGNED,
	PRIMARY KEY (id),
	FOREIGN KEY (accountid) REFERENCES musichub.account(id),
	FOREIGN KEY (workid) REFERENCES musichub.work(id),
	FOREIGN KEY (performanceid) REFERENCES musichub.performance(id)
);

-- admin role
INSERT INTO musichub.role (accountid, role) VALUES (1, 'admin');
INSERT INTO musichub.role (accountid, role, workid) VALUES (1, 'owner', 1);
INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (1, 'performancemanager', 1, 1);
INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (1, 'performancemanager', 1, 2);

-- action log
CREATE TABLE musichub.log (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	accountid SMALLINT UNSIGNED,
	timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	onaccountid SMALLINT UNSIGNED,
	workid SMALLINT UNSIGNED,
	performanceid SMALLINT UNSIGNED,
	action TINYTEXT NOT NULL,
	extrainfo TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY (accountid) REFERENCES musichub.account(id),
	FOREIGN KEY (onaccountid) REFERENCES musichub.account(id),
	FOREIGN KEY (workid) REFERENCES musichub.work(id),
	FOREIGN KEY (performanceid) REFERENCES musichub.performance(id)
);

-- general plugin/integration config (e.g. climb app on mrl-music)
CREATE TABLE musichub.plugin (
	id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
	title VARCHAR(200) NOT NULL,
	code VARCHAR(100) NOT NULL,
	PRIMARY KEY (id)
);

-- plugin config setting
CREATE TABLE musichub.plugin_setting (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	pluginid SMALLINT UNSIGNED NOT NULL,
	name VARCHAR(100) NOT NULL,
	value TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY (pluginid) REFERENCES musichub.plugin(id)
);

-- Climb! app
INSERT INTO musichub.plugin (id, title, code) 
  VALUES(1, 'Climb! app on music-mrl', 'climbapp');
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (1, 'test', '123');

-- performance-specific integration
CREATE TABLE musichub.performance_integration (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	performanceid SMALLINT UNSIGNED NOT NULL,
	pluginid SMALLINT UNSIGNED NOT NULL,
	enabled TINYINT NOT NULL DEFAULT 0,
	guid VARCHAR(100),
	PRIMARY KEY (id),
	FOREIGN KEY (performanceid) REFERENCES musichub.performance(id),
	FOREIGN KEY (pluginid) REFERENCES musichub.plugin(id)	
);

-- Climb! performances app integration(s)
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled) VALUES (1, 1, 1);
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled) VALUES (2, 1, 1);
