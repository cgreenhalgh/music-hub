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

### Climb! integrations

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

### Priority

- app management per performance
- archive configuration per performance
- performance audio/video file upload -> archive
- performance-specific MPM download
- account management
- performer downloads
- performance create/edit UI
- work create/edit UI

## Data and Access Model

Multiple user _accounts_ (local).

Authenticated access (username, password).

Multiple _roles_ in relation to a work/performance:
- `admin` - site admin, can create and manage accounts
- `publisher` - can create new works on the site
- `owner` - control of work
- `performancemanager` - control of a performance
- `performer` - can access supporting resources, e.g. for rehearsal
- `public` - anyone (default role)

System capabilities:
- `create-account`
- `edit-account`
- `manage-account`, e.g. block
- `view-account`

Capabilities in relation to a work:
- `create-work`
- `edit-work`
- `view-work`
- `edit-roles-work`
- `create-work-performance`

Capabilities in relation to a performance:
- `edit-performance`
- `view-performance`
- `edit-roles-performance`
- `download-performance`
- `create-recording`

Capabilities in relation to a recording:
- `edit-recording`
- `view-recording`

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
- standard descriptive/prospective metadata: title, description (html), performer (name, bio, links), venue (title, links), event? (title, links), date/time (planned)
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

## API design

Web API. 

Initially basic authentication. (order of priority)

`GET /api/1/account` -> account info.

`GET /api/1/works` -> array of works
`GET /api/1/work/<WORK>` -> work info
(1) `GET /api/1/work/<WORK>/performances` -> array of performances
(2) `GET /api/1/performance/<PERFORMANCE>` -> performance info

`PUT /api/1/performance/<PERFORMANCE>` -> edit performance info

`POST /api/1/work/<WORK>/performances` -> add new performance

(3) `GET /api/1/performance/<PERFORMANCE>/integrations` -> array of integrations (incl. disabled/possible?!)

(4) `GET /api/1/performance/<PERFORMANCE>/integration/<INTEGRATION>` -> integration info (including links to integration-specific downloads?!)

`PUT /api/1/performance/<PERFORMANCE>/integration/<INTEGRATION>` -> edit (create?!) integration info

(5) `PUT /api/1/performance/<PERFORMANCE>/integration/<INTEGRATION>/update` -> update integration (e.g. export files)
(6) `PUT /api/1/performance/<PERFORMANCE>/integration/<INTEGRATION>/clear` -> clear integration-related state (e.g. Climb! app redis state)

(7) `GET /api/1/performance/<PERFORMANCE>/integration/<INTEGRATION>/download/<DOWNLOAD>` -> integration-specific download (e.g. MPM file?)

