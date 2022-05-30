FROM node:alpine
WORKDIR /usr/app
COPY package.json .
COPY index.js .
COPY blacklist.js .
RUN npm install --quiet
CMD [ "node", "index.js" ]
VOLUME [ "/opt/data" ]