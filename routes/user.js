const express = require('express')
const { sequelize, User, Session } = require('../models')
var email = require("email-validator")
const { phone } = require('phone')
const { generateTokenData, authenticateRefreshToken, authenticateAccessToken, generateAccessToken, obfuscateToken } = require('../lib/tokens')
const moment = require('moment')
const { config } = require('../config')
const userify = require('../middlewares/userify')


const router = express.Router()


router.post('/signin', async (req, res) => {
  const { id, password } = req.body;
  const user = await User.findByPublicId(id)

  if (!user) {
    return res.status(400).json({ ok: false, error: 'There are no such user' })
  }

  if (!await user.validatePassword(password)) {
    return res.json({ error: 'Wrong password' });
  }

  const session = await Session.create({
    expireAt: moment().add(config.sessionExpireAfter).toDate(),
    userId: user.id,
  })

  const tokens = await generateTokenData(user.id, session.id)

  session.accessPart = tokens.accessPart
  session.accessHash = tokens.accessHash

  session.refreshPart = tokens.refreshPart
  session.refreshHash = tokens.refreshHash

  await session.save()

  return res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  })
})

router.get('/info', authenticateAccessToken, userify, (req, res) => {
  res.json({ user: req.user.getPublicId() })
})

router.post('/signin/new_token', authenticateRefreshToken, userify, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sessions = await req.user.getSessions({ where: { id: req.sessionId }, transaction })

    const session = sessions[0]

    await session.blacklistAccessToken()

    const accessToken = await generateAccessToken(req.userId, req.sessionId)

    session.accessPart = accessToken.accessPart
    session.accessHash = accessToken.accessHash

    await session.save({ transaction })
    await transaction.commit()

    res.json({ ok: true, user: req.user.id, accessToken: accessToken.accessToken })
  } catch (e) {
    console.error('Transaction error', e)
    await transaction.rollback()

    res.status(500).json({ ok: false, error: 'Failed to create new token' })
  }
})

router.get('/logout', authenticateAccessToken, userify, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const sessions = await req.user.getSessions({ where: { id: req.sessionId }, transaction })

    const session = sessions[0]

    await session.destroy({ transaction })
    await transaction.commit()

    res.json({ ok: true, logout: true })
  } catch (e) {
    console.error('Transaction error', e)
    await transaction.rollback()

    res.status(500).json({ ok: false, error: 'Failed to logout' })
  }
})


// args 
//  id: email | phone
//  password: string 

// ok: bool
// error: string | undefined
router.post('/signup', async (req, res) => {
  const { id, password } = req.body;

  if (email.validate(id)) {
    const result = await signup({
      email: id
    }, password)

    res.status(result.status).json(result.payload)

  } else if (phone(id).isValid) {
    const result = await signup({
      phone: id
    }, password)

    // TODO return tokens
    res.status(result.status).json(result.payload)
  } else {
    res.status(400).json({ ok: false, error: 'Wrong email or password' })
  }
})


async function signup(signupData, password) {
  const transaction = await sequelize.transaction()

  try {
    let user = await User.findOne({ where: signupData, transaction })

    if (user) {
      return {
        status: 400,
        payload: {
          ok: false,
          error: 'User already exists'
        }
      }
    }

    user = User.build({ ...signupData, password })

    await user.save({ transaction })
    await transaction.commit()

    return {
      status: 200,
      payload: {
        ok: true
      }
    }
  } catch (e) {
    console.error('Failed to create user', e)
    await transaction.rollback()

    return {
      status: 500,
      payload: {
        ok: false,
        error: 'Failed to create user'
      }
    }
  }
}

module.exports = router
