const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false });


/** Constants *************************************************/
const SUPPORTED_API_VERSIONS = ['1.0.0'];
const OCR_SANDBOX_PROCESSING = !!process.env.OCR_SANDBOX_PROCESSING;

exec("echo SB: " + OCR_SANDBOX_PROCESSING);

/** init express **********************************************/
app.set('view engine', 'ejs');
app.use(fileUpload({
  createParentPath: true
}));
/** EO: init express ******************************************/


app.get(['/', '/ocr(/:version)'], (req, res) => {
  // res.end(fs.readFileSync('./views/upload_form.html'));
  let version = req.params.version || SUPPORTED_API_VERSIONS[SUPPORTED_API_VERSIONS.length - 1];
  res.render('upload_form', { ocrPostPath: `/ocr/${version}/parseDocument`, sandbox: OCR_SANDBOX_PROCESSING });
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
  
  fs.writeFileSync(sourceFile, uploadedFile.data);

  // // convert to jpg if image with possible alpha was given
  // if (fileExtension.match(/(\.png|\.tiff)$/)) {
  //   try {
  //     let altSourceFile = `/tmp/uploads/${filenameRandom}.jpg`;
  //     fileExtension = '.jpg';
  //     execSync(`convert ${sourceFile} ${altSourceFile}`);
  //     exec(`rm ${sourceFile}`);

  //     sourceFile = altSourceFile;

  //   } catch(e) {
  //     log(e, res);
  //   }
  // }

  let outFile = `/tmp/uploads/${filenameRandom}_out${fileExtension}`;

  let returnPdf = !!req.param('returnPdf');
  let fromPage = req.param('fromPage');
  let toPage = process.env.MAX_PAGES ? (parseInt(fromPage || 1) + parseInt(process.env.MAX_PAGES)) : req.param('toPage');
  let pageDefinition = (fromPage || toPage) ? `--pages ${parseInt(fromPage || 1)}-${parseInt(toPage || 99)}` : '';

  let language = req.param('language') || process.env.DEFAULT_OCR_LANG || 'en';
  switch (language.toLowerCase()) {
    case 'de':
      language = 'deu';

    case 'en':
      language = 'eng';

    // ...
  }


  exec(`/usr/local/bin/ocrmypdf --rotate-pages --deskew --clean --remove-vectors ${pageDefinition} --keep-temporary-files --language ${language} --force-ocr --output-type pdfa ${sourceFile} ${outFile} 2>&1`, (error, stdout) => {
    if (error || !stdout) {
      log(req, error.message, res);
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

      if (req.is('json')) {
        res.writeHead(201, { 'Content-Type': 'application/json' });

        if (returnPdf) { // add full pdfa to response object
          recognizedFile.Pdfa = fs.readFileSync(outFile); // TODO: Encode with base64
        }

        res.end(JSON.stringify(recognizedFile, null, 3));
      } else {
        res.status(201);

        if (returnPdf) {
          // res.setHeader('Content-Type', 'application/pdf');
          res.download(outFile, `${path.basename(outFile)}.pdf`);
        } else {
          res.setHeader('Content-Type', 'text/html');
          res.render('detected_pages', { pages: recognizedFile.pages });
        }
      }

      // remove the processed tmp file completely.
      exec(`/usr/bin/rm -rf ${tmpDir} ${sourceFile} ${outFile}`);

    } else {
      log(req, 'Processing failed', res);
    }
  });
});

function returnError(req, error, res, status) {
  res.status(status || 500);

  if (req.is('json')) {
    res.end(JSON.stringify({ error: message }));
  } else {
    res.end(res.render('error', { error: error }));
  }
}

function log(req, message, res) {
  fs.appendFileSync('/tmp/errors.log', `-----------------------------------\n\n${message}\n\n\n`);

  if (res) {
    returnError(req, message, res);
    // res.writeHead(500);
    // res.end(JSON.stringify({ error: 'Processing failed, error logged.' }));
  }
}

app.listen(5000);
