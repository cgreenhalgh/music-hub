FROM node:8.9.1-stretch

RUN mkdir -p /root/work
WORKDIR /root/work

# bootstrap project
#RUN npm install @angular/cli

COPY . .

RUN cd hub-app; npm install

EXPOSE 4200
# karma testing
EXPOSE 9876
