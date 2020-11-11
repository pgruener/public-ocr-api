
# run it with
`docker run -d -p 5000:5000 registry.gitlab.com/rs-pub/ocr_doc_reader:v0.0.0`

## try it
`via browser: http://localhost:5000`

##or on command line
`curl  -F 'file=@/filepath.pdf' -F 'params=' http://localhost:5000 --output filepath_out.pdf`





# building
`docker build -t registry.gitlab.com/rs-pub/ocr_doc_reader:v0.0.0 .`
`docker push registry.gitlab.com/rs-pub/ocr_doc_reader:v0.0.0`
