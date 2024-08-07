const express = require('express')
const { File, sequelize } = require('../models')
const path = require('path')
const { authenticateAccessToken } = require('../lib/tokens')
const upload = require('../lib/uploads')
const userify = require('../middlewares/userify')

const router = express.Router()

router.use(authenticateAccessToken, userify)

/**
 * @typedef {{
 *  name: string,
 *  size: number,
 *  mimetype: string,
 *  extension: string,
 *  createdAt: Date,
 *  updatedAt: Date,}
 * } File 
 */

/**
 * @route POST /file/upload
 * @desc Uploads a new file and records its details in the database.
 * @access Private
 * @param {multipart} file - The file to be uploaded.
 * @returns {{ ok: boolean, file: File }} The file object with details.
 */
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

  res.json({ ok: true, file: fileObject })
})

/**
 * @route PUT /file/update/:id
 * @desc Updates an existing file with a new one.
 * @access Private
 * @param {string} id - The ID of the file to be updated.
 * @param {multipart} file - The new file to replace the old one.
 * @returns { { ok: boolean, originalFile: File, updated: File }} The updated file object.
 * @throws {404} File not exists
 * @throws {500} Failed to update file
 * */
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


/**
 * @route GET /file/list
 * @desc Retrieves a list of files with pagination.
 * @access Private
 * @param {number} [list_size=10] - The number of files per page.
 * @param {number} [page=0] - The page number.
 * @returns {Array<File>} A list of file objects.
 */
router.get('/list', async (req, res) => {
  let { list_size, page } = { list_size: 10, page: 0, ...req.query }

  const files = await req.user.getFiles({
    order: ['id'],
    limit: Number(list_size),
    offset: Number(list_size) * Number(page)
  })

  res.json({ ok: true, files: files.map(file => withoutPrivateFields(file.dataValues)) })
})

/**
 * @route GET /file/:id
 * @desc Retrieves information about a specific file.
 * @access Private
 * @param {string} id - The ID of the file.
 * @returns {{ ok: boolean, file: File}} The file object with details.
 * @throws {404} File not exists
 */
router.get('/:id', async (req, res) => {
  const fileId = req.params.id
  const files = await req.user.getFiles({ where: { id: fileId } })
  const file = files[0]

  if (!file) {
    return res.status(404).json({ ok: false, error: 'File not exists' })
  }
  res.json({ ok: true, file: withoutPrivateFields(file.dataValues) })
})

/**
 * @route DELETE /delete/:id
 * @desc Deletes a specific file from the system.
 * @access Private
 * @param {string} id - The ID of the file to delete.
 * @returns {{ ok: boolean, file: File }} The deleted file object.
 * @throws {404} File not exists
 * @throws {500} Failed to delete file
 */
router.delete('/delete/:id', async (req, res) => {
  const fileId = req.params.id
  const transaction = await sequelize.transaction();
  try {
    const files = await req.user.getFiles({ where: { id: fileId }, transaction })
    const file = files[0]

    if (!file) {
      return res.status(404).json({ ok: false, error: 'File not exists' })
    }

    await file.destroy({ transaction })
    await file.deleteFile()

    await transaction.commit()

    res.json({ ok: true, file: withoutPrivateFields(file.dataValues) })
  } catch (e) {
    await transaction.rollback()
    console.error('Transaction error', e)
    res.status(500).json({ ok: false, error: 'Failed to delete file' });
  }

})

/**
 * @route GET /download/:id
 * @desc Downloads a specific file.
 * @access Private
 * @param {string} id - The ID of the file to download.
 * @returns {File} The requested file.
 * @throws {404} File not exists
 * @throws {500} Failed to download file
 */
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