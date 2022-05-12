FROM node:latest

RUN mkdir -p /home/app
COPY . /home/app

ENV PORT=3000

EXPOSE 3000

CMD ["node", "/home/app/server.js"]