const { User } = require("../models")

async function userify(req, res, next) {
  req.user = await User.findById(req.user.id)

  if (!req.user) {
    res.status(500).json({ ok: false, error: 'Something went wrong, cannnot find user' })
  }
  next()
}

module.exports = userify