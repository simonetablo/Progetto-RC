FROM nginx

COPY ./iptables/rules.sh /docker-entrypoint.d

RUN apt update
RUN apt --assume-yes install iptables
