# Music Hub

Intended initially to provide a web interface for performances of 
Climb!, an electro-acouistic work which includes a supporting app and
archive.

by Chris Greenhalgh, 
Copyright (c) The University of Nottingham, 2017

Licensed under MIT open source license.

Status: starting...

See [docs/designnotes.md](docs/designnotes.md)

## Build / install

We'll use an internal network, `internal` - make it if it doesn't exist:
```
docker network create --driver bridge internal
```

```
LC_CTYPE=C < /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-32} > hubdb.password
LC_CTYPE=C < /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-32} > hubadmin.password
```
Written in typescript for Node.js
Dockerised.

Persistence: [mysql](https://hub.docker.com/_/mysql/)
```
docker run --name hubdb -e MYSQL_ROOT_PASSWORD=`cat hubdb.password` --network=internal -d --restart=always mysql:5.7
```

DB debug access:
```
docker run -it --rm --network=internal mysql:5.7 sh -c "exec mysql -hhubdb -P3306 -uroot -p`cat hubdb.password`"
```

Database set up - use [createdb.sql](createdb.sql).

```
docker build -t music-hub .
```

Dev.
```
docker run -it -p 4200:4200 -p 9876:9876 -p 8000:8000 --network=internal music-hub /bin/bash
```
in there
```
cd hub-app
`npm bin`/ng serve --host=0.0.0.0
`npm bin`/ng build -bh /
cd ../server
npm run build
node dist/index.js
```
open [http://127.0.0.1:4200/](http://127.0.0.1:4200/)


## TODO

MVP - see [designnotes API design](docs/designnotes.md#API%20design):

- server database connection
- server basic auth
- server get account (check auth)
- client log in
- server get performances
- client list performances (1)
- server get performance
- client show performance (2)
- server get integrations
- client show integrations (3)
- server get integration detail
- client show integration (4)
- server update integration
- client update integration
- server update integration climb app (5)
- server clear integration
- client clear integration 
- server clear integration climb app (6)
- server integration-specific download
- client integration-specific download
- server climbapp MPM file download (7)
