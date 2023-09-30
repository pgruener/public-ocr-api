FROM jbarlow83/ocrmypdf:v15.0.2

RUN apt-get update
RUN apt-get -y install imagemagick

# install nodejs
###############################################################
RUN apt-get -y install curl gnupg imagemagick
RUN curl -sL https://deb.nodesource.com/setup_20.x  | bash -
RUN apt-get -y install nodejs
RUN /usr/bin/npm install --save child_process fs express express-fileupload body-parser ejs i18next i18next-http-middleware i18next-node-fs-backend

# install crontab
###############################################################
RUN apt-get install cron
# RUN systemctl enable cron
COPY crontab /tmp/crontab
RUN su - root -c "crontab /tmp/crontab"
RUN rm /tmp/crontab
###


RUN sed -i 's/<policy domain="coder" rights="none" pattern="PDF"/<policy domain="coder" rights="write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml

COPY views /app/views
COPY assets /app/assets
COPY data /app/data
COPY locales /app/locales
COPY node_webserver.js /app

VOLUME /var/log/ocr

EXPOSE 5000

ENTRYPOINT ["/usr/bin/node", "/app/node_webserver"]
