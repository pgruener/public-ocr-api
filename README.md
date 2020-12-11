
# run it with
`docker run -d -p 5000:5000 rspub/ocr-api:0.0.5`

# run in sandbox mode
`docker run --env OCR_SANDBOX_PROCESSING=1 -d -p 5000:5000 rspub/ocr-api:0.0.5`

## try it
`via browser: http://localhost:5000`

## or on command line
`curl  -F 'file=@/filepath.pdf' -F http://localhost:5000 --output /filepath_out.pdf`


# building
`docker build -t rspub/ocr-api:0.0.5 .`
`docker push rspub/ocr-api:0.0.5`


# local building/testing
Previously to delete: docker rm -f `docker container ls -f "ancestor=rspub/ocr-api:0.0.5" -q`
`docker build -t ocr .`
`docker run -d -p 5000:5000 rspub/ocr-api:0.0.5`

quick:
docker rm -f `docker container ls -f "ancestor=rspub/ocr-api:0.0.5" -q` && docker build -t rspub/ocr-api:0.0.5 . && docker run -d -p 5000:5000 rspub/ocr-api:0.0.5

log into quickly
docker container logs -f `docker container ls -f "ancestor=rspub/ocr-api:0.0.5" -q`
docker exec -it `docker container ls -f "ancestor=rspub/ocr-api:0.0.5" -q` /bin/bash
