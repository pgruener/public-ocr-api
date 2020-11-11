FROM jbarlow83/ocrmypdf:v11.3.3

RUN apt-get update
RUN apt-get -y install imagemagick

# install nodejs
###############################################################
RUN apt-get -y install curl gnupg imagemagick
RUN curl -sL https://deb.nodesource.com/setup_15.x  | bash -
RUN apt-get -y install nodejs
RUN /usr/bin/npm install --save child_process fs express express-fileupload body-parser

# install crontab
###############################################################
RUN apt-get install cron
# RUN systemctl enable cron
COPY crontab /tmp/crontab
RUN su - root -c "crontab /tmp/crontab"
RUN rm /tmp/crontab
###

COPY node_webserver.js /app
ENTRYPOINT ["/usr/bin/node", "/app/node_webserver"]
