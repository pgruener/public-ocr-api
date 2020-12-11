const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const i18next = require('i18next');
const i18nFsBackend = require('i18next-node-fs-backend');
const middleware = require('i18next-express-middleware');
const express = require('express');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false });


/** Constants *************************************************/
const SUPPORTED_API_VERSIONS = ['1.0.0'];
const OCR_SANDBOX_PROCESSING = !!process.env.OCR_SANDBOX_PROCESSING;

// get current system language, supported languages and mappings for iso/639-1 & iso/639-2
const OCR_SYSTEM_LANG = process.env.OCR_SYSTEM_LANG || 'en';
const OCR_SUPPORTED_LANGUAGES = execSync('/usr/bin/tesseract --list-langs').toString().split(/\n+/).slice(1);
const ISO_LANG_MAPPINGS = JSON.parse(fs.readFileSync('./data/iso_lang_mappings.json'));
const OCR_SUPPORTED_LANGUAGES_ISO_9631 = OCR_SUPPORTED_LANGUAGES.map((lang_3) => {
  for (lang_2 in ISO_LANG_MAPPINGS) {
    let lang_3_descriptor = ISO_LANG_MAPPINGS[lang_2];

    if (!lang_3_descriptor) {
      return;
    }

    if (lang_3_descriptor['639-2'] === lang_3) {
      return [lang_2, lang_3];
    }
  }
}).filter(el => !!el);



/** init express **********************************************/
const app = express();

app.use('/assets/', express.static('/app/assets'));
app.set('view engine', 'ejs');
app.use(fileUpload({
  createParentPath: true,
}));

// i18n
i18next.init({
  ns: ['common'],
  defaultNS: 'common',
  lng: OCR_SYSTEM_LANG,
  fallbackLng: 'en'
});

i18next.
  use(middleware.LanguageDetector).init({
    order: ['querystring', 'header'],
    lookupQuerystring: 'language' // Doesn't currently work, *lng* (the default) is used instead.
  });

i18next.
  use(i18nFsBackend).init({
    initImmediate: false,
    fallbackLng: 'en',
    saveMissing: true,
    backend: {
      loadPath: __dirname +'/locales/{{lng}}/{{ns}}.yml',
      addPath: __dirname +'/locales/{{lng}}/{{ns}}.missing.yml'
    }
  });

app.use(
  middleware.handle(i18next, {
    removeLngFromUrl: true
  })
);
/** EO: init express ******************************************/


app.get(['/', '/ocr(/:version)'], (req, res) => {
  let version = req.params.version || SUPPORTED_API_VERSIONS[SUPPORTED_API_VERSIONS.length - 1];

  if (version) {
    version = version.replace(/[^0-9\.]/g, '');
  }

  res.render('upload_form', { ocrPostPath: `/ocr/${version}/parseDocument`, sandbox: OCR_SANDBOX_PROCESSING, languages: OCR_SUPPORTED_LANGUAGES_ISO_9631 });
});


app.post('/ocr/:version/parseDocument', urlencodedParser, (req, res) => {
  if (SUPPORTED_API_VERSIONS.indexOf(req.params.version) === -1) {
    returnError(req, `Unsupported version: ${req.params.version}`, res, 400);
    return;
  }

  if (!req.files || !req.files.file) {
    returnError(req, 'Please upload *file* parameter.', res, 400);
    return;
  }

  let uploadDest = '/tmp/uploads';
  execSync(`mkdir -p ${uploadDest}`);

  let uploadedFile = req.files.file;
  let fileExtension = uploadedFile.name.indexOf('.') ? uploadedFile.name.match(/(\.[^.]+)$/)[1] : '';
  let filenameRandom = Math.floor(Math.random() * 9999999);
  let sourceFile = `/tmp/uploads/${filenameRandom}${fileExtension}`;
  let returnPdf = !!req.body.returnPdf;
  
  fs.writeFileSync(sourceFile, uploadedFile.data);

  // prepare binary call
  let cmdArguments = [
    '--keep-temporary-files',
    '--optimize 0',
    '--force-ocr',
    '--rotate-pages',
    '--deskew',
    '--clean',
    '--fast-web-view 0',
    // '--remove-vectors'
  ];

  let fromPage = req.body.fromPage;
  let toPage = process.env.MAX_PAGES ? (parseInt(fromPage || 1) + parseInt(process.env.MAX_PAGES) - (fromPage ? 0 : 1)) : req.body.toPage;

  if (fromPage || toPage) {
    cmdArguments.push(`--pages ${parseInt(fromPage || 1)}-${parseInt(toPage || 99)}`);
  }

  if (returnPdf) {
    cmdArguments.push('--output-type pdfa');
  } else {
    cmdArguments.push('--output-type pdf');
  }

  // Language determination / mapping /////////////////////////
  // language is requested in ISO/639-1 (de, en, fr, ...)
  let languageRequested = process.env.DEFAULT_OCR_LANG || 'en';

  // check if user provided a different (but valid) language
  if (req.body.language && Object.keys(ISO_LANG_MAPPINGS).indexOf(new String(req.body.language).toString()) !== -1) {
    languageRequested = new String(req.body.language).toString();
  }

  if (languageRequested) {
    // get ISO/639-2 mapping for the requested ISO/639-1
    let language = ISO_LANG_MAPPINGS[languageRequested]['639-2'];

    // make sure the valid language is also available on the system
    if (language && OCR_SUPPORTED_LANGUAGES.indexOf(language) !== -1) {
      cmdArguments.push(`--language ${language}`);
    }
  }
  // EO Language determination ////////////////////////////////

  callOcr({
    req: req,
    res: res,
    sourceFile: sourceFile,
    outFile: `/tmp/uploads/${filenameRandom}_out${fileExtension}`,
    returnPdf: returnPdf
  }, cmdArguments);
  
});

function callOcr(opts, cmdArguments) {
  exec(`/usr/local/bin/ocrmypdf ${cmdArguments.join(' ')} ${opts.sourceFile} ${opts.outFile} 2>&1`, (error, stdout) => {

    if (error || !stdout) {
      let errorMessage = error ? (error.message || 'No message') : 'No return value received from extracting command';
      if (stdout) {
        errorMessage += '\nresult:\n'+ stdout;
      }

      if (!opts.retries && (    stdout.indexOf('Input file is an image, but the resolution (DPI) is not credible') > -1
                            ||  stdout.indexOf('Input file is an image, but has no resolution (DPI) in its metadata') > -1
                            ||  stdout.indexOf('DpiError') > -1
                            ||  stdout.indexOf('UnsupportedImageFormatError') > -1)) {

        opts.retries = (opts.retries || 0) + 1;
        if (!opts.errorMessage) {
          opts.errorMessage = '';
        }

        opts.errorMessage += 'Input file was an invalid image with alpha, with too small DPI or with unknown DPI; converting to pdf before ...\n';

        execSync(`/usr/bin/convert -quality 100 -strip ${opts.sourceFile} ${opts.sourceFile}.pdf`);
        opts.sourceFile = `${opts.sourceFile}.pdf`; // adjust source file

        callOcr(opts, cmdArguments);
      } else {
        log(opts.req, errorMessage, opts.res, { internalError: true });
      }

      return;
    }

    // check if tmpdir was printed, which indicates success (again)
    let tmpDirMatcher = stdout.match(/(\/tmp\/.*)$/m);

    if (tmpDirMatcher) {
      let tmpDir = tmpDirMatcher[1];
      let recognizedFile = { pages: [] };

      // read recognizedFile
      fs.readdirSync(tmpDir).forEach(filename => {
        let filenameMatcher = filename.match(/0*([0-9]+?)_ocr_tess\.txt$/);

        if (filenameMatcher) {
          recognizedFile.pages.push({ page: parseInt(filenameMatcher[1]), content: fs.readFileSync(`${tmpDir}/${filename}`, 'utf-8', 'r') })
        }
      });

      if (opts.req.accepts('json')) { // json
        opts.res.writeHead(201, { 'Content-Type': 'application/json' });

        if (opts.returnPdf) { // add full pdfa to response object
          recognizedFile.Pdfa = fs.readFileSync(opts.outFile, 'base64');
        }

        opts.res.end(JSON.stringify(recognizedFile, null, 3));
      } else { // html
        opts.res.status(201);

        if (opts.returnPdf) {
          // opts.res.setHeader('Content-Type', 'application/pdf');
          opts.res.download(opts.outFile, `${path.basename(opts.outFile)}.pdf`);
        } else {
          opts.res.setHeader('Content-Type', 'text/html');
          opts.res.render('detected_pages', { pages: recognizedFile.pages });
        }
      }

      // remove the processed tmp file completely.
      exec(`/usr/bin/rm -rf ${tmpDir} ${opts.sourceFile} ${opts.outFile}`);

    } else {
      log(opts.req, 'Processing failed', opts.res);
    }
  });
}

function returnError(req, error, res, status) {
  res.status(status || 500);

  if (req.accepts('json')) {
    res.end(JSON.stringify({ error: error }));
  } else {
    res.render('error', { error: error });
  }
}

function log(req, message, res, settings) {
  fs.appendFileSync('/tmp/errors.log', `-----------------------------------\n\n${message}\n\n\n`);


  if (settings && settings.internalError) {
    message = 'Internal error'; // Dont propagate internal errors.
  }

  if (res) {
    returnError(req, message, res);
  }
}

app.listen(5000);
