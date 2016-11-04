FROM debian:jessie-backports

RUN apt-get update --yes && apt-get upgrade --yes
RUN apt-get install -y --no-install-recommends \ 
  git \
  nodejs \ 
  npm

RUN ln -s `which nodejs` /usr/bin/node