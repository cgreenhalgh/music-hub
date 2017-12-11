FROM node:8.9.1-stretch

RUN mkdir -p /root/work
WORKDIR /root/work

# bootstrap project
#RUN npm install @angular/cli

RUN mkdir hub-app
COPY hub-app/package.json hub-app/package-lock.json hub-app/

RUN cd hub-app; npm install

RUN mkdir server
COPY server/package.json server/package-lock.json server/
RUN cd server; npm install

COPY hub-app hub-app
RUN cd hub-app; `npm bin`/ng build -bh /

COPY server server
RUN cd server; npm run build

# ng serve
EXPOSE 4200
# karma testing
EXPOSE 9876

# music-hub API server
EXPOSE 8000
