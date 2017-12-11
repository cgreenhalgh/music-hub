import * as express from 'express'

import { authenticate, AuthenticationError, getWorks } from './db'

const router = express.Router()

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
  return res.sendStatus(401)
}

function badrequest(res, message:string) {
  console.log(`bad request: ${message}`)
  res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
  return res.sendStatus(400)
}

router.use((req, res, next) => {
  let authorization = req.headers.authorization
  if (req.user) return next()
  if (!authorization) return unauthorized(res)
  // parse
  let parts = authorization.split(' ')
  if (parts.length !== 2) return badrequest(res, 'Authorization header badly formatter')
  let scheme = parts[0]
    , credentials = new Buffer(parts[1], 'base64').toString()
    , index = credentials.indexOf(':')

  if ('Basic' != scheme || index < 0) return badrequest(res, 'Authorization header not basic or missing :')

  let name = credentials.slice(0, index)
    , pass = credentials.slice(index + 1)

  if (!name || !pass) {
    return unauthorized(res)
  }
  
  authenticate(name, pass)
  .then((account) => {
    req.user = account
    return next()
  })
  .catch((err) => {
    if (err instanceof AuthenticationError) {
      console.log(`Authentication error: `+err.message)
      return unauthorized(res)
    } else {
      console.log(`Internal error: `+err.message, err)
      res.sendStatus(500)
      return
    }
  })
})

// GET account
router.get('/account', (req, res) => {
  if (!req.user) {
    console.log(`Error: GET /account with null req.user`)
    return unauthorized(res)
  }
  res.setHeader('Content-type', 'application/json')
  res.send(JSON.stringify(req.user))
})

// GET works
router.get('/works', (req, res) => {
  getWorks(req.user)
  .then((works) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(works))
  })
  .catch((err) => {
    console.log(`Error getting works: ${err.message}`, err)
    res.sendStatus(500)
  })
})

/* GET api listing. */
router.get('/', (req, res) => {
  res.send('api works');
})

module.exports = router