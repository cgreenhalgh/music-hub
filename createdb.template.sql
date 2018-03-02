CREATE DATABASE musichub
  DEFAULT CHARACTER SET utf8
  DEFAULT COLLATE utf8_general_ci;

-- musichub webserver mysql account (with limited access, e.g. can't change schema)
CREATE USER musichub IDENTIFIED WITH mysql_native_password BY 'MUSICHUB_PASSWORD';
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
  VALUES ( 1, 'root@musichub', 'HUBADMIN_PASSWORD', 'Hub admin', 'default hub admin account' );

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
	location VARCHAR(200) NOT NULL,
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

-- audio/video recordings
CREATE TABLE musichub.recording (
	id smallint unsigned not null auto_increment, 
	workid smallint unsigned not null,
	performanceid SMALLINT UNSIGNED not null,
	relpath VARCHAR(200) NOT NULL,
	mimetype VARCHAR(100) NOT NULL,
	perspective VARCHAR(100),
	start_time_offset FLOAT(10,3) NOT NULL DEFAULT 0,
	public TINYINT NOT NULL DEFAULT 0,
	PRIMARY KEY (id),
	FOREIGN KEY (workid) REFERENCES musichub.work(id),
	FOREIGN KEY (performanceid) REFERENCES musichub.performance(id)
);

-- TODO log files

-- Climb! all your bass performance 1
INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status )
  VALUES (1, 1, 'Climb! at All Your Bass', 'Anne Veinberg', 'Anne Veinberg ...', 'Royal Concert Hall', 'Nottingham ','2018-01-19', '18:30:00', '+00:00', 0, 'CONFIRMED');

UPDATE musichub.performance SET performer_bio = '<p><b>Anne Veinberg</b> is an Australian pianist based in the Netherlands. Anne is passionate about music of and for today. She regularly collaborates with composers, actors and technologists to develop new works and musical experiences. Anne is a member of Ensemble Scala for microtonal music, of Apituley’s Locomotive Band for music theatre productions and of the live coding and piano duo Off&lt;&gt;zz. In 2017, Felipe Ignacio Noriega and Anne started developing the CodeKlavier which is a system that enables a pianist to live code through playing the piano. </p><p>Through the docARTES program, Anne is a doctoral candidate at Leiden University. Her research focuses on the intersection and interaction of pianistic and live coding performance practices. At home she practises on a Yamaha grand piano, kindly on loan from the Dutch Musical Instruments Foundation. The piano is part of the collection ‘Willem G. Vogelaar’.</p>' WHERE id = 1;

INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status, linked_performanceid )
  VALUES (2, 1, 'Climb! at All Your Bass (2)', 'Zubin Kanga', 'Zubin Kanga ...', 'Royal Concert Hall', 'Nottingham', '2018-01-19', '19:00:00', '+00:00', 0, 'CONFIRMED', 1);

UPDATE musichub.performance SET performer_bio = '<p><b>Zubin Kanga</b> is a pianist, composer, improviser and technologist. He has collaborated with many of the world’s leading composers including Thomas Adès, Michael Finnissy, George Benjamin and Steve Reich and premiered more than 90 new works. He is a member of Ensemble Offspring and the Marsyas Trio, and has performed piano duos with Rolf Hind and Thomas Adès. His solo work in recent years has focused on new models of interaction between a live musician and new technologies, using film, AI, motion capture and virtual reality.</p><p>Zubin has performed at many international festivals including the BBC Proms, Huddersfield Contemporary Music Festival (UK) Melbourne Festival (Australia), Manifeste Festival (France) and Borealis Festival (Norway). He has performed several concerti under the composer’s baton, including with Thomas Adès and the Melbourne Symphony Orchestra and with Beat Furrer and the London Sinfonietta.</p><p>A Masters and PhD graduate of the Royal Academy of Music, London, Zubin recently finished a post as post-doctoral researcher at the University of Nice and IRCAM, Paris and is currently the Leverhulme Research Fellow at Royal Holloway, University of London.</p><p><a href="http://www.zubinkanga.com">www.zubinkanga.com</a></p>' WHERE id = 2;

INSERT INTO musichub.recording (id, workid, performanceid, relpath, mimetype, perspective, start_time_offset, public ) VALUES (1, 1, 1, 'Climb_AYB_Anne-roughmix.mp3', 'audio/mpeg', 'roughmix', 2.5, 1);
INSERT INTO musichub.recording (id, workid, performanceid, relpath, mimetype, perspective, start_time_offset, public ) VALUES (2, 1, 2, 'Climb_AYB_Zubin-roughmix.mp3', 'audio/mpeg', 'roughmix', 1, 1);
INSERT INTO musichub.recording (id, workid, performanceid, relpath, mimetype, perspective, start_time_offset, public ) VALUES (3, 1, 1, 'Climb_AYB_Anne-front.mp4', 'video/mp4', 'front', 2.5, 1);
INSERT INTO musichub.recording (id, workid, performanceid, relpath, mimetype, perspective, start_time_offset, public ) VALUES (4, 1, 2, 'Climb_AYB_Zubin-front.mp4', 'video/mp4', 'front', 1, 1);

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
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (1, 'appurl', 'http://music-mrl.nott.ac.uk/2/muzivisual/');
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (1, 'logprocapiurl', 'http://uploader:{{env.LOGPROC_PASSWORD}}@music-mrl.nott.ac.uk/1/logproc/api');
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (1, 'redishost', 'music-mrl.nott.ac.uk');
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (1, 'publicrecordingurl', 'http://music-mrl.nott.ac.uk/1/recordings/');

INSERT INTO musichub.plugin (id, title, code) 
  VALUES(2, 'Climb! app on localhost', 'climbapp');
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (2, 'appurl', 'http://localhost:8080/2/muzivisual/');
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (2, 'logprocapiurl', 'http://uploader:{{env.LOGPROC_PASSWORD}}@localhost:8080/1/logproc/api');
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (2, 'redishost', 'localhost');
INSERT INTO musichub.plugin_setting (pluginid, name, value) VALUES (2, 'publicrecordingurl', 'http://localhost:8080/1/recordings/');



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

-- performance-specific integration setting
CREATE TABLE musichub.performance_integration_setting (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
	perfintid INT UNSIGNED NOT NULL,
	performanceid SMALLINT UNSIGNED NOT NULL,
	pluginid SMALLINT UNSIGNED NOT NULL,
	name VARCHAR(100) NOT NULL,
	value TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY (performanceid) REFERENCES musichub.performance(id),
	FOREIGN KEY (pluginid) REFERENCES musichub.plugin(id),	
	FOREIGN KEY (perfintid) REFERENCES musichub.performance_integration(id)
);

-- Climb! performances app integration(s)
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (1, 1, 1, '20180119-allyourbass1');
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (2, 1, 1, '20180119-allyourbass2');


-- FAST All Hands Demo
INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status )
  VALUES (3, 1, 'Climb! at FAST AHM 2018 (1)', 'No-one in particular', 'Something interesting to read...', 'The Oval', 'London','2017-12-20', '13:00:00', '+00:00', 0, 'CONFIRMED');
INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status )
  VALUES (4, 1, 'Climb! at FAST AHM 2018 (2)', 'No-one in particular', 'Something interesting to read...', 'The Oval', 'London','2017-12-20', '13:30:00', '+00:00', 0, 'CONFIRMED');

INSERT INTO musichub.account (id, email, passwordhash, nickname, description)
  VALUES ( 2, 'adrian', 'HUBADMIN_PASSWORD', 'Adrian', 'Adrians account' );

INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (3, 1, 1, '20171220-climb-fastahm1');
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (4, 1, 1, '20180119-climb-fastahm2');

INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (3, 2, 1, '20171220-climb-fastahm1');
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (4, 2, 1, '20180119-climb-fastahm2');

INSERT INTO musichub.role (accountid, role, workid) VALUES (2, 'owner', 1);
INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (2, 'performancemanager', 1, 3);
INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (2, 'performancemanager', 1, 4);

-- Audio Mostly 2017 legacy
INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status )
  VALUES (5, 1, 'AM2017 test', 'Maria Kallionpaa', '<div><b>Dr. Maria Kallionp&auml;&auml; (1981)</b> is an internationally active composer and pianist. She earned her PhD in composition at the University of Oxford in 2015. Kallionp&auml;&auml; won the first prize of the OUPHIL composition competition in 2013. She has graduated from the Royal Academy of Music (2009) and Universit&auml;t f&uuml;r Musik and Darstellende Kunst Wien (2010) and has also studied composition and piano at Sibelius Academy and Universit&auml;t Mozarteum Salzburg. Her works have been performed at Musikverein Wien, Philharmonie Luxembourg, and Sibiu Philharmonia. In 2011 Kallionp&auml;&auml; was a commissioned composer of the Turku European Culture Capital and a finalist of the Tenso European Chamber Choir Composition Competition. Kallionp&auml;&auml; has performed at numerous music festivals including Rainy Days Festival at Philharmonie Luxembourg, Musica Nova (Helsinki), Spitalfields Festival (London), and Neue Musik von Thuringen. In 2016 her music was performed at the Florida International Toy Piano Festival.</div>', 
    'Audio Mostly', 'London','2017-08-25', '14:00:00', '+00:00', 0, 'CONFIRMED');
INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status )
  VALUES (6, 1, 'AM2017 dress rehearsal', 'Maria Kallionpaa', '<div><b>Dr. Maria Kallionp&auml;&auml; (1981)</b> is an internationally active composer and pianist. She earned her PhD in composition at the University of Oxford in 2015. Kallionp&auml;&auml; won the first prize of the OUPHIL composition competition in 2013. She has graduated from the Royal Academy of Music (2009) and Universit&auml;t f&uuml;r Musik and Darstellende Kunst Wien (2010) and has also studied composition and piano at Sibelius Academy and Universit&auml;t Mozarteum Salzburg. Her works have been performed at Musikverein Wien, Philharmonie Luxembourg, and Sibiu Philharmonia. In 2011 Kallionp&auml;&auml; was a commissioned composer of the Turku European Culture Capital and a finalist of the Tenso European Chamber Choir Composition Competition. Kallionp&auml;&auml; has performed at numerous music festivals including Rainy Days Festival at Philharmonie Luxembourg, Musica Nova (Helsinki), Spitalfields Festival (London), and Neue Musik von Thuringen. In 2016 her music was performed at the Florida International Toy Piano Festival.</div>', 
    'Audio Mostly', 'London','2017-08-25', '17:00:00', '+00:00', 0, 'CONFIRMED');
INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status )
  VALUES (7, 1, 'AM2017', 'Maria Kallionpaa', '<div><b>Dr. Maria Kallionp&auml;&auml; (1981)</b> is an internationally active composer and pianist. She earned her PhD in composition at the University of Oxford in 2015. Kallionp&auml;&auml; won the first prize of the OUPHIL composition competition in 2013. She has graduated from the Royal Academy of Music (2009) and Universit&auml;t f&uuml;r Musik and Darstellende Kunst Wien (2010) and has also studied composition and piano at Sibelius Academy and Universit&auml;t Mozarteum Salzburg. Her works have been performed at Musikverein Wien, Philharmonie Luxembourg, and Sibiu Philharmonia. In 2011 Kallionp&auml;&auml; was a commissioned composer of the Turku European Culture Capital and a finalist of the Tenso European Chamber Choir Composition Competition. Kallionp&auml;&auml; has performed at numerous music festivals including Rainy Days Festival at Philharmonie Luxembourg, Musica Nova (Helsinki), Spitalfields Festival (London), and Neue Musik von Thuringen. In 2016 her music was performed at the Florida International Toy Piano Festival.</div>', 
    'Audio Mostly', 'London','2017-08-25', '18:00:00', '+00:00', 0, 'CONFIRMED');

INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (5, 1, 1, 'de3250be-9b54-4a7b-9675-fd145fc2561c');
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (6, 1, 1, 'e888ea0f-8c81-48a8-8462-bc98dd04f495');
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (7, 1, 1, 'f01a5d26-6569-4879-9aef-58334110c307');

INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (2, 'performancemanager', 1, 5);
INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (2, 'performancemanager', 1, 6);
INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (2, 'performancemanager', 1, 7);

-- Guildhall 2018-02-21

INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status )
  VALUES (8, 1, 'Climb! at RCC 2018 (1)', 'Maria Kallionpaa', '<div><b>Dr. Maria Kallionp&auml;&auml; (1981)</b> is an internationally active composer and pianist. She earned her PhD in composition at the University of Oxford in 2015. Kallionp&auml;&auml; won the first prize of the OUPHIL composition competition in 2013. She has graduated from the Royal Academy of Music (2009) and Universit&auml;t f&uuml;r Musik and Darstellende Kunst Wien (2010) and has also studied composition and piano at Sibelius Academy and Universit&auml;t Mozarteum Salzburg. Her works have been performed at Musikverein Wien, Philharmonie Luxembourg, and Sibiu Philharmonia. In 2011 Kallionp&auml;&auml; was a commissioned composer of the Turku European Culture Capital and a finalist of the Tenso European Chamber Choir Composition Competition. Kallionp&auml;&auml; has performed at numerous music festivals including Rainy Days Festival at Philharmonie Luxembourg, Musica Nova (Helsinki), Spitalfields Festival (London), and Neue Musik von Thuringen. In 2016 her music was performed at the Florida International Toy Piano Festival.</div>', 
    'Guildhall', 'London','2018-02-21', '14:00:00', '+00:00', 0, 'CONFIRMED');
INSERT INTO musichub.performance (id, workid, title, performer_title, performer_bio, venue_title, location, date, time, timezone, public, status, linked_performanceid )
  VALUES (9, 1, 'Climb! at RCC 2018 (2)', 'Maria Kallionpaa', '', 
    'Guildhall', 'London','2018-02-21', '14:30:00', '+00:00', 0, 'CONFIRMED', 8);

INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (8, 1, 1, '20180221-rcc-1');
INSERT INTO musichub.performance_integration (performanceid, pluginid, enabled, guid) VALUES (9, 1, 1, '20180221-rcc-2');

INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (2, 'performancemanager', 1, 8);
INSERT INTO musichub.role (accountid, role, workid, performanceid) VALUES (2, 'performancemanager', 1, 9);

UPDATE musichub.performance SET performer_title = _latin1"Maria Kallionpää" WHERE id = 8;
UPDATE musichub.performance SET performer_title = _latin1"Maria Kallionpää" WHERE id = 9;

INSERT INTO musichub.recording (id, workid, performanceid, relpath, mimetype, perspective, start_time_offset, public ) VALUES (5, 1, 8, 'Climb_RCC2018_1-front.mp3', 'audio/mpeg', 'wide-audio', 1.5, 1);
INSERT INTO musichub.recording (id, workid, performanceid, relpath, mimetype, perspective, start_time_offset, public ) VALUES (6, 1, 9, 'Climb_RCC2018_2-front.mp3', 'audio/mpeg', 'wide-audio', 1, 1);
INSERT INTO musichub.recording (id, workid, performanceid, relpath, mimetype, perspective, start_time_offset, public ) VALUES (7, 1, 8, 'Climb_RCC2018_1-front-480.mp4', 'video/mp4', 'wide', 1.5, 1);
INSERT INTO musichub.recording (id, workid, performanceid, relpath, mimetype, perspective, start_time_offset, public ) VALUES (8, 1, 9, 'Climb_RCC2018_2-front-480.mp4', 'video/mp4', 'wide', 1, 1);

-- fix
-- update performance set timezone = '+00:00';
