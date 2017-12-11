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

Written in typescript for Node.js
Dockerised.

Persistence: [mysql](https://hub.docker.com/_/mysql/)
```
docker run --name hubdb -e MYSQL_ROOT_PASSWORD=pw -d --restart=always mysql:5.7
```

DB debug access:
```
docker run -it --link hubdb:mysql --rm mysql:5.7 sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ENV_MYSQL_ROOT_PASSWORD"'
```

