const express = require('express')
const { sequelize, User, Session } = require('../models')
var email = require("email-validator")
const { phone } = require('phone')
const { generateTokenData, authenticateRefreshToken, authenticateAccessToken, generateAccessToken, obfuscateToken } = require('../lib/tokens')
const userify = require('../middlewares/userify')


const router = express.Router()


/**
 * @typedef {{
*  id: string,
*  password: string
* }} SigninRequest
*/

/**
* @typedef {{
*  ok: boolean,
*  accessToken: string,
*  refreshToken: string
* }} SigninResponse
*/

/**
* @route POST /signin
* @desc Signs in a user and returns access and refresh tokens.
* @access Public
* @param {SigninRequest} req.body - User credentials.
* @returns {SigninResponse} The access and refresh tokens.
* @throws {400} No such user or wrong password.
*/
router.post('/signin', async (req, res) => {
  const { id, password } = req.body;
  const user = await User.findByPublicId(id)

  if (!user) {
    return res.status(400).json({ ok: false, error: 'There are no such user' })
  }

  if (!await user.validatePassword(password)) {
    return res.status(400).json({ ok: false, error: 'Wrong password' });
  }

  const session = await Session.create({ userId: user.id })

  const tokens = await generateTokenData(user.id, session.id)

  session.accessPart = tokens.accessPart
  session.accessHash = tokens.accessHash

  session.refreshPart = tokens.refreshPart
  session.refreshHash = tokens.refreshHash

  await session.save()

  return res.json({
    ok: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  })
})

/**
* @typedef {{
*  ok: boolean,
*  user: string
* }} InfoResponse
*/

/**
* @route GET /info
* @desc Retrieves information about the currently authenticated user.
* @access Private
* @returns {InfoResponse} The user information.
*/
router.get('/info', authenticateAccessToken, userify, (req, res) => {
  res.json({ ok: true, user: req.user.getPublicId() })
})


/**
* @typedef {{
*  ok: boolean,
*  accessToken: string,
*  user: string
* }} NewTokenResponse
*/

/**
* @route POST /signin/new_token
* @desc Issues a new access token for the user.
* @access Private
* @returns {NewTokenResponse} The new access token.
* @throws {500} Failed to create new token.
*/
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

/**
* @typedef {{
*  ok: boolean,
*  logout: boolean
* }} LogoutResponse
*/

/**
* @route GET /logout
* @desc Logs out the user and invalidates the current session.
* @access Private
* @returns {LogoutResponse} Confirmation of logout.
* @throws {500} Failed to logout.
*/
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


/**
* @typedef {{
*  id: string,
*  password: string
* }} SignupRequest
*/

/**
* @typedef {{
*  ok: boolean,
*  error?: string
* }} SignupResponse
*/

/**
* @route POST /signup
* @desc Signs up a new user.
* @access Public
* @param {SignupRequest} req.body - User details.
* @returns {SignupResponse} Result of the signup attempt.
* @throws {400} Wrong email or phone.
* @throws {500} Failed to create user.
*/
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
