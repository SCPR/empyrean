FROM node:9.7-alpine

USER root

ENV HOME /root

WORKDIR /root

ADD . .

RUN npm install

ENV GRAND_CENTRAL_ENV=production

CMD ["bin/grand-central"]

