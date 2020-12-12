# Quick reference

- Maintained by: [Royal Software GmbH](https://royal-software.de/email-ocr/)
- Where to get help: [the Docker Community Forums](https://forums.docker.com/), [create a ticket on Github](https://github.com/pgruener/public-ocr-api)

# What is **Public OCR API** (POA)?

Public OCR API is an HTTP webservice (based on NodeJS), which implements the **Public OCR API definition** (POAD).

With this **POA** implementation you can simply enable OCR detection for your application and have your free OCR
service up and running in seconds.

**POA** implements the **POAD** interface and uses [OCRmyPDF](https://github.com/jbarlow83/OCRmyPDF) under the
hood, to perform the *real work* of OCR recognition.

OCRmyPDF itself makes use of HP/Googles tesseract library, which is a basic AI for character recognition. That's
a huge advantage, as it is a well maintained project, which is in use in many real-word use cases and provides
[100s of trained langauge data](https://github.com/tesseract-ocr/tessdata).

Refer the up-to-date API: https://www.postman.com/rs-public

# What is **Public OCR API definition** (POAD)?

There are many software vendors and solutions, which are used to recognize text data of images or documents.
And there are increasingly many use cases, which make it necessary to fullfil those requirements to proceed with digitalization.

The bad thing is, that all of those services have different interfaces.

So if any company decides to improve their processes using OCR, they are forced to follow some of the following steps:
- Check if the own enterprise software provides integration-possibilities for one or more OCR service vendors
  - If yes: you will be forced to buy the solution from the one vendor, which is connectable out-of-the-box to your system.
  - If not: the integration to your system(s) needs to be built (or ordered) from you.
    You'll have to find several solutions and test those, which meets your needs mostly.
    From now on, you're locked in and each turn to another software will be the same effort again.

That's why we decided to define a Standard for a RESTful HTTP API, which may be chosen by several OCR vendors, to be implemented.
Also the enterprise solutions will be much more flexible, if it chooses to build the interface to this standard, as all of the
software solutions, which are already providing this interface, will be pluggable out-of-the-box then.

As most of the vendors already implement some kind of a RESTful interface, it's that huge effort, they need to do.

Especially, as our main goal is, to keep the interface as simple as possible.

For all software solutions, which want to integrate a OCR software, should choose to implement **Public OCR API definition** (POAD).
They can afterwards use this image, to integrate an open source solution, for their customers at no additional costs. If their
customers needs another solution, they can simply choose between all **POA** supported vendors (ocr solution vendors, which support the
**POAD** interface). Now they can easily license other services and plug them in, without any additional efforts.

# How to use this image

## Start the POA service

Starting your first POA instance is pretty easy. Just log into your docker environment and run the following command:

    $ docker run -d -p 5000:5000 rspub/ocr-api:0.0.5

... where you might adjust the port and tag to your needs.

That's it!
You can now browse to `http://your-servers-fqdn:5000` and recognize the characters for your first images or PDF documents.

**or on command line**
`curl  -F 'file=@/filepath.pdf' -F http://your-servers-fqdn:5000 -H "Accept: application/json" --output /filepath_out.pdf`


## ... via docker stack deploy or docker-compose

Exampe `poa-stack.yml` file for POA:

    version: '3.7'
    services:
      ocr_sandbox:
        image: rspub/ocr-api:0.0.5
        environment:
          - OCR_SANDBOX_PROCESSING=true
          - OMP_THREAD_LIMIT=1
          - MAX_PAGES=3

Run `docker stack deploy -c poa-stack.yml poa` (or `docker-compose -f poa-stack.yml up`), wait for it to initialize completely, and visit `http://swarm-ip:5000`, `http://localhost:5000`, or `http://your-servers-fqdn:5000` (as appropriate).


**or on command line**

    $ curl  -F 'file=@/filepath.pdf' -F http://your-servers-fqdn:5000 -H "Accept: application/json" --output /filepath_out.pdf


## Container shell access

The `docker exec` command allows you to run commands inside a Docker container. The following command line will give you a bash shell inside your poa container:

    $ docker exec -it `docker container ls -f "ancestor=rspub/ocr-api:0.0.5" -q` /bin/bash

Or if you made some changes in your own fork and are having trouble to start the container, you might want to dive into the container and debug some things live:

    $ docker run -it --entrypoint /bin/bash `docker images rspub/ocr-api:0.0.5 -q` -s


## Viewing POA logs

The log is available through Docker's container log:

    $ docker container logs -f `docker container ls -f "ancestor=rspub/ocr-api:0.0.5" -q`

# Container configuration with environment variables

When you start the POA image, you can adjust the configuration of the instance's behaviour by passing one or more environment variables on the `docker run` command line.

## OCR_SANDBOX_PROCESSING

Indicates if the container should run in sandbox mode.
Usually you won't use this, as it's only purpose is to display some more information on the website, which informs the user, that this instance is a sandbox and might
be restricted and limited in its functionality.

## OCR_SYSTEM_LANG

Defines the default language of the webinterface. Currently only **en** and **de** are supported.

The language is automatically influenced by the visitor's browser.
If the visitor's preferred language is english, he'll get the page in english, no matter which setting
was chosen here.

It's just the fallback value for those, who don't speak a supported language or prevented their browser
from sending a preferred language.

## DEFAULT_OCR_LANG

Defines the system language.
This defines the default language for OCR recognition, if no language was defined in the requests.
That only makes sense, if you run this container only for documents of one single language. If you dont
know, which languages will be used on your images/documents, you should keep it empty as well as the
language parameter in the REST API.

In this case, the detection will use all of the installed languages in the image. This is more flexible
but will be slower.

## MAX_PAGES

If you want to limit the amount of pages for each document, you can use this variable.
If you set it to 3 (for example), then only 3 pages are processed in the permitted document. The API
allows the parameter **fromPage** to set the starting point.

## OMP_THREAD_LIMIT

The documents will be processed in severall processes on all available CPUs. And each process will distribute
its work over several threads.

There are situations and CPU architectures, where the single-threaded recogonition is faster than the multithreaded.
With this parameter you can influence the amount of threads in each parallel process to test, which setting fits
most for you.


# Install more languages

For tesseract more than 100 languages are available.
In this image the languages `de,en,fr,es,pt*` are included.

If you need more languages in one specific container, you could log into the container (described in: [Container shell access](#container-shell-access))
and list all available languages with:

    $ apt-cache search tesseract-ocr

And install the disered ones using:

    $ apt-get install tesseract-ocr-`LANGUAGE(-BUNDLE) NAME`

If you need it in the image definition itself, you should fork this repository and implement another instruction to the Dockerfile.

If you're implementing a reliable solution (like specification via environment variables), we'd like to get your pull-request for it.

# Extending / changing / customization

We highly appreciate if you want to contribute to this project or just want to change something.
Feel free to fork the repository and afterwards ship us a pull-request.

In the following sections, there is a small list of docker commands, which you might use to test
and troubleshoot your first changes.


## building

    docker build -t rspub/ocr-api:0.0.5 .
    docker push rspub/ocr-api:0.0.5

Where the tag number should be adjusted.

## local building/testing

Previously to delete the current container:

    docker rm -f `docker container ls -f "ancestor=rspub/ocr-api:0.0.5" -q`

Build the new one from the local directoy

    docker build -t rspub/ocr-api:0.0.5 .

And run it

    docker run -d -p 5000:5000 rspub/ocr-api:0.0.5

All commands quickly concatenated:

    docker rm -f `docker container ls -f "ancestor=rspub/ocr-api:0.0.5" -q` && docker build -t rspub/ocr-api:0.0.5 . && docker run -d -p 5000:5000 rspub/ocr-api:0.0.5


# Copyright and license

Code and documentation copyright 2020 [Royal Software GmbH](https://royal-software.de). Code is released under the MIT License.

This means, you may use all parts of this repository, in commercial or private projects, how it fits your needs.

The base of this image is [OCRmyPDF](https://github.com/jbarlow83/OCRmyPDF), which is released in a different, but still very broad
usable license: Mozilla Public License 2.0 (MPL-2.0).

There are several other components in different licenses under the hood, which you should check out.

# Disclaimer

The software is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
