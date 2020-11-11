FROM jbarlow83/ocrmypdf:v11.3.3

# # Download last language package
# RUN mkdir -p /usr/share/tessdata
# ADD https://github.com/tesseract-ocr/tessdata/raw/master/deu.traineddata /usr/share/tessdata/deu.traineddata

RUN apt-get update
RUN apt-get -y install imagemagick

# install nodejs
###############################################################
RUN apt-get -y install curl gnupg imagemagick
RUN curl -sL https://deb.nodesource.com/setup_15.x  | bash -
RUN apt-get -y install nodejs
# RUN /usr/bin/npm install
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
# ENTRYPOINT ["/bin/bash"]

# OPY node_webserver.js /app
# NTRYPOINT ["/usr/bin/python3", "/app/node_webserver.js"]

# build docker 
# docker build -t rs/ocr .

# run
# docker run -t -i -p 5000:5000 rs/ocr
#
# try it
# curl  -F 'file=@/filepath.pdf' -F 'params=' http://localhost:5000 --output filepath_out.pdf
#
