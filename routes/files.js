const express = require('express')
const { File, sequelize } = require('../models')
const path = require('path')
const { authenticateAccessToken } = require('../lib/tokens')
const upload = require('../lib/uploads')
const userify = require('../middlewares/userify')

const router = express.Router()

router.use(authenticateAccessToken, userify)


router.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file
  const extension = path.extname(file.originalname)

  const fileObject = await File.create({
    path: file.path,
    name: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    userId: req.user.id,
    extension
  })

  res.json({ file: fileObject })
})

router.put('/update/:id', upload.single('file'), async (req, res) => {
  const fileId = req.params.id
  const transaction = await sequelize.transaction();

  try {
    const files = await req.user.getFiles({ where: { id: fileId }, transaction })

    if (!files.length) {
      return res.status(404).json({ ok: false, error: 'File not exists' })
    }

    const fileObject = files[0]


    const originalFile = { ...fileObject.dataValues }

    await fileObject.deleteFile()

    const newFile = req.file

    fileObject.path = newFile.path
    fileObject.name = newFile.originalname
    fileObject.mimetype = newFile.mimetype
    fileObject.size = newFile.size
    fileObject.extension = path.extname(newFile.originalname)

    await fileObject.save({ transaction })

    await transaction.commit()

    res.json({ ok: true, originalFile, updated: fileObject })
  } catch (e) {
    await transaction.rollback()

    console.error('Transaction error', e)

    res.status(500).json({ ok: false, error: 'Failed to update file' });
  }
})


router.get('/list', async (req, res) => {
  let { list_size, page } = { list_size: 10, page: 0, ...req.query }

  const files = await req.user.getFiles({
    order: ['id'],
    limit: Number(list_size),
    offset: Number(list_size) * Number(page)
  })

  res.json(files.map(file => withoutPrivateFields(file.dataValues)))
})

router.get('/:id', async (req, res) => {
  const fileId = req.params.id
  const files = await req.user.getFiles({ where: { id: fileId } })
  const file = files[0]

  if (!file) {
    return res.status(404).json({ ok: false, error: 'File not exists' })
  }
  res.json({ ok: true, file: withoutPrivateFields(file.dataValues) })
})

router.delete('/delete/:id', async (req, res) => {
  const fileId = req.params.id
  const transaction = await sequelize.transaction();
  try {
    const files = await req.user.getFiles({ where: { id: fileId }, transaction })
    const file = files[0]

    if (!file) {
      return res.status(404).json({ ok: false, error: 'File not exists' })
    }

    await file.destroy()
    await file.deleteFile()

    await transaction.commit()

    res.json({ ok: true, file: withoutPrivateFields(file.dataValues) })
  } catch (e) {
    await transaction.rollback()
    console.error('Transaction error', e)
    res.status(500).json({ ok: false, error: 'Failed to delete file' });
  }

})

router.get('/download/:id', async (req, res) => {
  const fileId = req.params.id
  const files = await req.user.getFiles({ where: { id: fileId } })
  if (!files.length) {
    return res.status(404).json({ ok: false, error: 'File not exists' })
  }

  const file = files[0]

  res.sendFile(path.resolve(file.path))
})

// Need this to avoid abstraction leakage, since these are internal fields and doesn't matter to end user
function withoutPrivateFields(data) { 
  const result = { ...data }
  delete result.path
  delete result.userId
  delete result.UserId
  return result
}

module.exports = router