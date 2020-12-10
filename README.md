
# run it with
`docker run -d -p 5000:5000 registry.gitlab.com/rs-pub/ocr_doc_reader:v1.0.0`

# run in sandbox mode
`docker run --env OCR_SANDBOX_PROCESSING=1 -d -p 5000:5000 registry.gitlab.com/rs-pub/ocr_doc_reader:v1.0.0`

## try it
`via browser: http://localhost:5000`

## or on command line
`curl  -F 'file=@/filepath.pdf' -F http://localhost:5000 --output /filepath_out.pdf`


# building
`docker build -t registry.gitlab.com/rs-pub/ocr_doc_reader:v1.0.0 .`
`docker push registry.gitlab.com/rs-pub/ocr_doc_reader:v1.0.0`


# local building/testing
Previously to delete: docker rm -f `docker container ls -f "ancestor=ocr:latest" -q`
`docker build -t ocr .`
`docker run -d -p 5000:5000 ocr:latest`

quick:
docker rm -f `docker container ls -f "ancestor=ocr:latest" -q` && docker build -t ocr . && docker run -d -p 5000:5000 ocr:latest

log into quickly
docker exec -it `docker container ls -f "ancestor=ocr:latest" -q` /bin/bash