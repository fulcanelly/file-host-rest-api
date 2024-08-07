const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const files = require('./routes/files')
const user = require('./routes/user')
const { rateLimit } = require('express-rate-limit')
const logger = require('morgan')
const cors = require('cors')
const { config } = require('./config')

const limiter = rateLimit({
  windowMs: config.limits.timeWindow.asMilliseconds(),
  max: config.limits.request,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(limiter)
app.use(
  cors({
    origin: '*'
  }))

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(express.json());


app.use('/', user)
app.use('/file', files)

app.use((err, req, res, next) => {
  console.error('Something went wrong', err)
  res.status(500).send({ ok: false, error: 'Something went wrong' })
})

app.listen(3000, () => {
  console.log('Server running on port 3000');
})