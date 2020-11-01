/////////////////////////////////
//       DEPENDENCIES
/////////////////////////////////
const express = require("express");
const app = express();
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");


/////////////////////////////////
// VIEW TEMPLATE / MIDDLEWARE
/////////////////////////////////
// EJS //
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(methodOverride("_method"));

/////////////////////////////////
//       MONGO URI
/////////////////////////////////
const mongoURI = "mongodb+srv://admin:admin@filesuploaded.ea5jv.mongodb.net/FilesUploaded";

/////////////////////////////////
//       MONGOOSE
/////////////////////////////////
const conn = mongoose.createConnection(mongoURI);

/////////////////////////////////
//       FS-STREAM
/////////////////////////////////
let gfs;

conn.once("open", () => {
  //init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads"); //name is uploads
});

/////////////////////////////////
//       FS STORAGE
/////////////////////////////////
//Init Storage Engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });



/////////////////////////////////
//       ROUTES
/////////////////////////////////
// @route GET /
// @desc Loads form
app.get("/", (req, res) => {
    gfs.files.find().toArray((err, files) => {
        console.log(files)
        //check if files
        if (!files || files.length === 0) {
        res.render('index', {files: false});
        } else {
            files.map(file => {
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
                {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            });

            res.render('index' , {files : files})
        } 
        
      });
});

// @route POST /uploads
// @desc Uploads file to DB
// file from the file name in the ejs
app.post("/upload", upload.single("file"), (req, res) => {
  //just to see the file
  res.json({ file: req.file });
  // redirect to index
  // res.redirect("/")
});

// @route GET /files
// @desc display all file in JSON
app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    //check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "no files exist",
      });
    }

    //files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc display one file object in JSON
app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    //check files
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "no files exist",
      });
    }
    // file exist
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc display image
app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    //check files
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "no files exist",
      });
    }

    // Check if image
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      // read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not an image",
      });
    }
  });
});


// @route DELETE /files/:id
// @desc delete file
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
      if (err) {
        return res.status(404).json({ err: err });
      }
  
      res.redirect('/');
    });
  });

/////////////////////////////////
//       LISTENER
/////////////////////////////////
// LISTENER //
const port = 5000;
app.listen(port, () => console.log(`Server started on port ${port}`));
