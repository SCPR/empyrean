FROM node:9.7-alpine

USER root

RUN addgroup -S grand-central && adduser -S -g grand-central grand-central 

WORKDIR /home/grand-central

ADD . .

RUN npm install --production

RUN chmod -R u+X bin

USER grand-central

ENV HOME /home/grand-central

CMD ["bin/grand-central"]

