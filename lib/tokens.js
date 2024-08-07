const jwt = require('jsonwebtoken')
const { redisClient } = require('./redis')
const bcrypt = require('bcrypt')
const fs = require('fs')
const crypto = require('crypto');

const ACCESS_TOKEN_SECRET_KEY = fs.readFileSync('secret/access_token.key')
const REFRESH_TOKEN_SECRET_KEY = fs.readFileSync('secret/refresh_token.key')

async function generateAccessToken(id, sessionId) {
  const accessToken = jwt.sign({
    date: Date.now(),
    id,
    sessionId
  }, ACCESS_TOKEN_SECRET_KEY, { algorithm: 'HS256', expiresIn: '100s' })

  return {
    accessPart: 'access:' + obfuscateToken(accessToken),
    accessHash: await bcrypt.hash(accessToken, 10),
    accessToken
  }
}

async function generateRefreshToken(id, sessionId) {

  const refreshToken = jwt.sign({
    date: Date.now(),
    id,
    sessionId
  }, REFRESH_TOKEN_SECRET_KEY, { algorithm: 'HS256', expiresIn: '100s' })

  return {
    refreshPart: 'refresh:' + obfuscateToken(refreshToken),
    refreshHash: await bcrypt.hash(refreshToken, 10),
    refreshToken
  }
}

async function generateTokenData(id, sessionId) {
  return {
    ...await generateAccessToken(id, sessionId),
    ...await generateRefreshToken(id, sessionId)
  }
}

/**
 * @param {string} token 
 */
function obfuscateToken(token) {
  const partSize = 40;
  const tokenParts = {
    id: jwt.decode(token).id,
    start: token.slice(0, partSize),
    end: token.slice(-partSize)
  };

  // Create a hash of the token parts for additional obfuscation
  const hash = crypto.createHash('sha256')
    .update(tokenParts.start + tokenParts.end)
    .digest('hex');

  return `${tokenParts.id}:${tokenParts.start}:${tokenParts.end}:${hash}`;
}

async function isTokenBlacklisted(prefix, token) {
  const tokenPart = prefix + obfuscateToken(token)
  const hash = await redisClient.get(tokenPart)

  if (!hash) {
    return
  }

  return bcrypt.compare(token, hash)
}

async function authenticateAccessToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ ok: false, error: 'Need token to access route' })
  }

  if (await isTokenBlacklisted('blacklist:access:', token)) {
    return res.status(403).json({ ok: false, error: 'Invalid token' })
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET_KEY, { algorithms: ['HS256'] }, (err, data) => {
    if (err) {
      return res.status(403).json({ ok: false, error: 'Token expired or invalid' })
    }

    req.user = data
    req.token = token
    req.sessionId = data.sessionId

    next()
  })
}

async function authenticateRefreshToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ ok: false, error: 'Need token to access route' })
  }

  if (await isTokenBlacklisted('blacklist:refresh:', token)) {
    return res.status(403).json({ ok: false, error: 'Invalid token' })
  }

  jwt.verify(token, REFRESH_TOKEN_SECRET_KEY, { algorithms: ['HS256'] }, (err, data) => {
    if (err) {
      return res.status(403).json({ ok: false, error: 'Token expired or invalid' })
    }

    req.user = data
    req.token = token
    req.sessionId = data.sessionId

    next()
  })
}

module.exports = {
  authenticateAccessToken,
  authenticateRefreshToken,
  obfuscateToken,
  generateTokenData,
  generateAccessToken
}