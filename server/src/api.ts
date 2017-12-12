import * as express from 'express'

import { authenticate, getWork, getWorks, getPerformances } from './db'
import { AuthenticationError, PermissionError, NotFoundError } from './exceptions'

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

function sendError(res, err:Error) {
  if (err instanceof AuthenticationError)
    unauthorized(res)
  else if (err instanceof PermissionError) {
    // forbidden
    res.sendStatus(403)
  } else if (err instanceof NotFoundError) {
    // not found
    res.sendStatus(404)
  }
  else {
    console.log(`Internal error: ${err.message}`, err)
    res.sendStatus(500)
  }
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
    sendError(res, err)
  })
})
// GET work
router.get('/work/:workid', (req, res) => {
  var workid
  try { workid = Number(req.params.workid) }
  catch (err) {
    console.log(`get /work/${req.params.workid} - not a number`)
    res.setStatus(404)
  }
  //console.log(`get work ${workid}`)
  getWork(req.user, workid)
  .then((work) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(work))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
// GET performances
router.get('/work/:workid/performances', (req, res) => {
  var workid
  try { workid = Number(req.params.workid) }
  catch (err) {
    console.log(`get /work/${req.params.workid}/performances - not a number`)
    res.setStatus(404)
  }
  getWork(req.user, workid)
  .then((work) => {
    getPerformances(req.user, work)
    .then((perfs) => {
      res.setHeader('Content-type', 'application/json')
      res.send(JSON.stringify(perfs))
    })
    .catch((err) => {
      sendError(res, err)
    })
  })
  .catch((err) => {
    sendError(res, err)
  })
})

/* GET api listing. */
router.get('/', (req, res) => {
  res.send('api works');
})

module.exports = router