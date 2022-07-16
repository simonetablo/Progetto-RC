FROM node

WORKDIR /usr/node

RUN npm install -g nodemon
RUN npm install apidoc -g

COPY package.json .
COPY package-lock.json .

RUN npm install

ENV NODE_ENV=development
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "run", "dev"]
