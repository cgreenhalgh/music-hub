# Music Hub Design Notes

## Overview

Written in typescript for Angular/Node.js.
Dockerised.

Persistence: [mysql](https://hub.docker.com/_/mysql/)

Angular(2) web UI; node.js API.

## Requirements

Multiple _works_. 
E.g. Climb!.
Note: currently undefined whether different versions/editions should be treated as different works.

Each work has associated downloadable resources. 
E.g. score files, patches. These may be used for rehearsal and/or performance.

Each work has associated online services.
E.g. Climb! archive, Climb! performance app.

Each work may have multiple _performances_.

Each performance may:
- be represented within the online services (e.g. archive entry for this performance)
- have tailored views on the online service(s) that can be configured through this hub (e.g. specific app (link) for this performance) and/or 
- have performance-specific downloads (e.g. performance-specific configuration files)
- have associated audio, video and/or log file recordings

### Priority

- app management per performance
- archive configuration per performance
- performance audio/video file upload -> archive
- performance-specific MPM download
- account management
- performer downloads
- performance create/edit UI
- work create/edit UI

## Climb! integrations

Specifically for Climb!...

There should be a custom app link for each performance (or pair of linked performances). This will:
- show the performer(s) for that performance
- show the title(s) for that performance
- show status and live updates for that performance (via unique performance GUID)
- show one or two performances as appropriate
- show past performances as appropriate that performance

There should be an option to reset the app live performance state. This will:
- delete the relevant entries from the app Redis (which links from muzicodes)

There should be a music-performance-manager (MPM) configuration file download for each performance (or pair of linked performances). This will:
- include the unique performance GUID(s)
- include the appropriate archive upload URL and credentials

There should be a muzicodes configuration screen for each performance. This will:
- include the appropriate app linkage (redis) URL and credentials
Note: in a future version this might be managed via the MPM

There should be an outgoing link to the archive. This will:
- list the performance(s) in the archive (if desired)
- link the uploaded/processed log information into the archive
- export and link uploaded audio/video recordings into the archive

### Climb app integration

Needs to generate per-performance climb app configuration file, named for performance guid. 
This includes/requires:
- performance title, performer, location
- performance GUID
- performer bios
- past performances - metadata AND app event logs
- stage information - title, map information
- narrative segments
- linked performance (handling differently for first and second)

In the short term the past performance information can be taken from a fixed file.

The plugin will need to be able to write files to the app's `data/` folder, and read the past performances file.

### Climb archive integration

Needs to generate per-server urls file (`urls.json`, array of app-relative datafile URLs) in the archive's `assets/data/` folder. This includes links to:
- various initial files including premiere performance info, climb structure
- hub performance metadata data, with entries for every hub-managed performance in the archive (see below)
- per-performance history log file view, with specific start time, section performances and triggered codes. This is initially just a standard 'empty' (i.e. recordless) archive/analist data file.

Needs to generate per-server performance metadata file, with, for each performance:
- Performance record (Note: these all need to be in the same file and that file needs to be readable by the logproc log processor)
- Person record for performaer
- ? Location record for venue
- Recording records for every available recording of the Performance (unless they are in a separate per-performance recordings file)

Note, this being in one file implies coordinated archive-wide output generation. Unless this is a two-stage process with intermediate output files per performance. Or unless the logproc can use the same indirection. 
Plan A: per-performance files; combined into one. With locking.

Template files:
- `archive-performance.json` - `{{performanceid}}`, `{{performancetitle}}`, `{{systemid}}`, `{{datetime}}`, `{{description}}`, `{{performerid}}` (person id)
- `archive-person.json` - `{{personid}}`, `{{persontitle}}`, `{{bio}}`
- `archive-recording.json` - replace `{{performanceid}}`, `{{performancetitle}}`, `{{recordingid}}`, `{{datetime}}`, `{{description}}`, `{{starttimeoffset}`
- `archive-audio-clip.json` - replace `{{performanceid}}`, `{{performancetitle}}`, `{{recordingid}}`, `{{url}}`
- `archive-urls.json` - initial urls (array)
- `archive-empty.json` - 'empty' data file - add items to object's `annal:entity_list` array. 

Note, archive will probably now need to handle recording coll:startTimeOffset to fix recording time. Unless we read the real performance start time from the processed log?!

## Data and Access Model

Multiple user _accounts_ (local).

Authenticated access (username, password).

Multiple _roles_ in relation to a work/performance:
- `admin` - site admin, can create and manage accounts
- `publisher` - can create new works on the site
- `owner` - (of work) control of work
- `performer` - (of work) can access supporting resources, e.g. for rehearsal
- `performancemanager` - (of performance) control of a performance
- `public` - anyone (default role)

System capabilities:
- `create-account` (admin)
- `edit-account` (admin or the account holder)
- `manage-account`, e.g. block (admin)
- `view-account` (anyone)
- `create-plugin` (not yet defined/used)
- `manage-plugin` (not yet defined/used)

Capabilities in relation to a work:
- `create-work` (admin or publisher)
- `edit-work` (owner)
- `view-work` (anyone - for now - all works are public!)
- `download-work` (owner, performer of work)
- `edit-roles-work` (owner or admin)
- `create-work-performance` (owner; ?? performer ??) -> establishes performance manager (required unless owner)

Capabilities in relation to a performance:
- `edit-performance` (work owner or performance manager)
- `view-performance`  (anyone if public, else admin, work owner or performance manager)
- `edit-roles-performance` (owner of work or admin)
- `create-recording` (default: performance manager)
- `manage-performance-integration` (default: performance manager)
- `create-performance-integration` (admin)

Capabilities in relation to a recording:
- `edit-recording` (default: performance manager)
- `view-recording` (anyone if public, else owner or performance manager)

Multiple _performances_ of a work.

Each account has:
- email
- password
- nickname? (screen name)
- description?

Each role assignment has:
- account, role, work, performance?

Each work has:
- standard metadata: title, version/edition, year created, composer, description
- visibility (public, private)
- a set of _downloads_ available to performers, e.g. score files, patches, software
- a set of technical integrations, e.g. archive, app (details TBD)

Each performance has:
- work
- standard descriptive/prospective metadata: title, description (html), performer (name, bio, links), venue (title, links), location (e.g. city; used in app), event? (title, links), date/time (planned)
- visibility (public, private)
- status (proposed, confirmed, onnow, completed, cancelled)
- linked performance(s), e.g. two performances of Climb! within a single concert to be shown in the same app.
- performance-specific aspects of technical integrations, e.g. archive, app (details TBD)
- a set of uploaded audio/video recordings of the performance
- a set of uploaded log files from the performance

Each recording/log file has:
- performance
- work
- title
- description?
- date/time
- start offfset? (first note time)
- file
- mime type
- duration?
- size?
- visibility (public, private)

Actions are logged.

Each log record has:
- account, date/time, action, account?, work?, performance?, other info?

For integration/plugin:
- id, title (e.g. climbapp on mrl-music)
- work(s)? performance(s)? (restrictions on applicability)
- plugin code identifier (`climbapp`) (for looking up in internal registry/file loader)
- configuration, e.g. passwords, hostnames, paths

For performance (Climb!) app integration:
- performance
- integration
- enabled
- GUID (climb-specific?!)
- (past performances?)

Each plugin has a set of possible actions with:
- id
- title, description
- confirm, i.e. requires explicit confirmation

Each plugin action response has:
- message - readable
- error? (if failed)
- data?

## API design

Web API. 

Initially basic authentication. (order of priority)

`GET /api/1/account` -> account info.(current user)

(13) `GET /api/1/capability/<CAPABILITY>` -> true/false (current user)
(13) `GET /api/1/work/<WORK>/capability/<CAPABILITY>` -> true/false (current user)
(13) `GET /api/1/performance/<PERFORMANCE>/capability/<CAPABILITY>` -> true/false (current user)
(12) `GET /api/1/accounts` -> all accounts info.
(14) `POST /api/1/accounts` -> return new id

`GET /api/1/works` -> array of works
`GET /api/1/work/<WORK>` -> work info
(1) `GET /api/1/work/<WORK>/performances` -> array of performances
(2) `GET /api/1/performance/<PERFORMANCE>` -> performance info

(10) `PUT /api/1/performance/<PERFORMANCE>` -> edit performance info

(11) `POST /api/1/work/<WORK>/performances` -> add new performance

`GET /api/1/work/<WORK>/downloads` -> array of downloads
`GET /api/1/work/<WORK>/roles` -> array of RoleAssignments
`PUT /api/1/work/<WORK>/account/<ACCOUNT>/role/<ROLE>` - send {grant:true/false}

`GET /downloads/<WORK>/<FILENAME>` -> download

(3) `GET /api/1/performance/<PERFORMANCE>/integrations` -> array of integrations (incl. disabled/possible?!)

(4) `GET /api/1/performance/<PERFORMANCE>/integration/<PLUGIN>` -> integration info (including links to integration-specific downloads?!)

`PUT /api/1/performance/<PERFORMANCE>/integration/<PLUGIN>` -> edit (create?!) integration info

(5)`PUT /api/1/performance/<PERFORMANCE>/integration/<PLUGIN>/<ACTION>` -> perform a plugin action

(6) `PUT /api/1/performance/<PERFORMANCE>/integration/<PLUGIN>/redis-list` -> get Climb! app redis state
(7) `PUT /api/1/performance/<PERFORMANCE>/integration/<PLUGIN>/redis-clear` -> clear Climb! app redis state
(8) `PUT /api/1/performance/<PERFORMANCE>/integration/<PLUGIN>/app-config` -> update app config file

(9) `GET /api/1/performance/<PERFORMANCE>/integration/<PLUGIN>/download/<DOWNLOAD>` -> integration-specific download (e.g. MPM file?)

`GET /api/1/performance/<PERFORMANCE>/recordings` -> array of recordings

`GET /api/1/performance/<PERFORMANCE>/roles` -> array of RoleAssignments
`PUT /api/1/performance/<PERFORMANCE>/account/<ACCOUNT>/role/<ROLE>` - send true/false
