const { exec, execSync } = require('child_process');
const fs = require('fs');

const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(fileUpload({
  createParentPath: true
}));

app.get('/', (req, res) => {
  res.end(`<!doctype html>
    <head>
      <meta charset="utf-8"/>
      <title>OCR Texterkennung</title>
    </head>

    <body>
      <h1>Texterkennung in PDFs</h1>

      <p>
        Der Dienst akzeptiert Bildmaterial und vorverarbeitet es mit den folgenden Routinen:
      </p>

      <ul>
        <li>Rotiert das Bild, wenn erkannt wurde, dass es falsch herum liegt.</li>
        <li>Rückt es in die richtige Proportion, falls es aus einem schrägen Winkel aufgenommen wurde.</li>
        <li>Entfernt/Ignoriert weitestgehend Bilder, die kein Text repräsentieren.</li>
        <li>Entfernt Stör-Artefakte vom Scannen.</li>
      </ul>

      <p>
        Info: Sowohl die hochgeladenen Dokumente, als auch die verarbeiteten Ergebnisse werden unmittelbar
        nach Beendigung der Anfrage restlos gelöscht.
      </p>
      <p>

        Die Spracherkennung erfolgt aktuell nur in deutsch.
      </p>

      <p>
        Im Erfolgsfall wird ein wird ein JSON zurückgegeben, das nach den Seitennummern strukturiert ist.
        (Jetzt limitiert auf die ersten drei Seiten).
      </p>

      <form method="post" enctype="multipart/form-data" action="/imageToJSON">
        <label for="file">Dokument zum Hochladen wählen</label>
        <input type="file" name="file">
        <input type="submit" value="Hochladen und verarbeiten">
      </form>
    
      <h2>Achtung</h2>
      <p>Dieser Dienst basiert auf freier Software mit unterschiedlichen Lizenzen. Darunter MIT, GNU Affero General Public License u. GPL (http://www.gnu.org/licenses/)</p>
      <p>Er kann nach Belieben verwendet werden. Allerdings übernehmen wir keinerlei Haftung oder Garantien zur Richtigkeit, Verfügbarkeit o.ä.</p>
    </body>
  </html>`);
});

app.post('/imageToJSON', urlencodedParser, (req, res) => {
  if (!req.files || !req.files.file) {
    res.setHeader('Content-Type', 'text/plain')
    res.writeHead('400');
    res.end('Please upload *file* parameter.');
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


  exec(`/usr/local/bin/ocrmypdf --rotate-pages --deskew --clean --remove-vectors --pages 1-3 --keep-temporary-files --language deu --force-ocr --output-type pdfa ${sourceFile} ${outFile} 2>&1`, (error, stdout) => {
    if (error || !stdout) {
      log(error.message, res);
      return;
    }

    // check if tmpdir was printed, which indicates success (again)
    let tmpDirMatcher = stdout.match(/(\/tmp\/.*)$/m);

    if (tmpDirMatcher) {
      let tmpDir = tmpDirMatcher[1];

      let recognizedPages = {};

      // read recognizedPages
      fs.readdirSync(tmpDir).forEach(filename => {
        let filenameMatcher = filename.match(/0*([0-9]+?)_ocr_tess\.txt$/);

        if (filenameMatcher) {
          recognizedPages[`page${filenameMatcher[1]}`] = fs.readFileSync(`${tmpDir}/${filename}`, 'utf-8', 'r');
        }
      });
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(recognizedPages, null, 3));

      // remove the processed tmp file completely.
      exec(`/usr/bin/rm -rf ${tmpDir} ${sourceFile} ${outFile}`);

    } else {
      res.writeHead(500);
      res.end('Processing failed');
    }
  });
});

function log(message, res) {
  fs.appendFileSync('/tmp/errors.log', `-----------------------------------\n\n${message}\n\n\n`);

  if (res) {
    res.writeHead(500);
    res.end('Processing failed, error logged.');
  }
}

app.listen(5000);
