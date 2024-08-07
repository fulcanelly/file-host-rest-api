const fs = require('fs')
const multer = require('multer')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniquePrefix + '-' + file.originalname)
  }
})

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

const upload = multer({ 
  storage,
  limits: {
    fieldSize: 1024 * 1024 * 100, // 100 MB
    fieldNameSize: 50
  }
})

module.exports = upload