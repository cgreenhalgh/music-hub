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
LC_CTYPE=C < /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-32} > musichub.password
LC_CTYPE=C < /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-32} > hubadmin.password
sed -e "s/MUSICHUB_PASSWORD/`cat musichub.password`/;s/HUBADMIN_PASSWORD/`cat hubadmin.password`/" createdb.sql.template > createdb.sql
```
Written in typescript for Node.js
Dockerised.

Persistence: [mysql](https://hub.docker.com/_/mysql/)
```
docker run --name hubdb -e MYSQL_ROOT_PASSWORD=`cat hubdb.password` --network=internal -d --restart=always mysql:5.7
```

init db?!
```
cat createdb.sql | docker run -i --rm --network=internal mysql:5.7 sh -c "exec mysql -hhubdb -P3306 -uroot -p`cat hubdb.password`"
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
docker run -it -p 4200:4200 -p 9876:9876 -p 8000:8000 --network=internal -e HUBADMIN_PASSWORD=`cat hubadmin.password` music-hub /bin/bash
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

### Test

```
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/account
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/works
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/work/1
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/work/1/downloads
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/work/1/performances
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/performance/1
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/performance/1/recordings
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/performance/1/integrations
curl -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/performance/1/integration/1
curl -X POST -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/performance/1/integration/1/redis-list
curl -X POST -v http://root%40musichub:Eaw_a4lmaxEkRXCoxD3jH0o37HvUCJas@localhost:8000/api/1/performance/1/integration/1/redis-clear
curl -X POST -v http://adrian:PW@localhost:8000/api/1/performance/3/integration/1/app-config
curl -X POST -v http://adrian:PW@localhost:8000/api/1/performance/3/integration/1/get-url
curl -X POST -v http://adrian:PW@localhost:8000/api/1/performance/3/integration/2/get-url
curl -X POST -v http://adrian:PW@localhost:8000/api/1/performance/3/integration/1/get-mpm-config
// linked...
curl -X POST -v http://root%40musichub:PW@localhost:8000/api/1/performance/1/integration/1/get-mpm-config
curl -X POST -v http://root%40musichub:PW@localhost:8000/api/1/performance/1/integration/2/get-mpm-config
curl -X POST -v http://root%40musichub:PW@localhost:8000/api/1/performance/1/integration/1/app-config
curl -X POST -v http://root%40musichub:PW@localhost:8000/api/1/performance/1/integration/2/app-config
```


## TODO

MVP - see [designnotes API design](docs/designnotes.md#API%20design):

- linked performance app configuration
- integration-specific settings - server
- integration-specific settings - show UI
- archive generate top-level file
- archive generate performance file

future;
- archive recording upload UI+server
- performance edit UI+server
- work edit UI+server
- plugin edit UI+server
- account create UI+server
- account role assignment UI+server
