import { AuthenticationError, PermissionError, NotFoundError } from './exceptions'
import { Work } from './types'
import { authenticate } from './db'

export function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
  return res.sendStatus(401)
}

export function badrequest(res, message:string) {
  console.log(`bad request: ${message}`)
  res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
  return res.sendStatus(400)
}

export function sendError(res, err:Error) {
  if (err instanceof AuthenticationError)
    unauthorized(res)
  else if (err instanceof PermissionError) {
    // forbidden
    res.status(403)
    res.send(err.message)
  } else if (err instanceof NotFoundError) {
    // not found
    res.status(404)
    res.send(err.message)
  }
  else {
    console.log(`Internal error: ${err.message}`, err)
    res.status(500)
    res.send(err.message)
  }
}

export function getDownloadsDirForWork(work:Work):string {
  return __dirname+'/../../downloads/works/'+work.id
}

export function crossDomainOptions(req, res, next) {
  //console.log('add Access-Control-Allow-Origin')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  //intercepts OPTIONS method
  if ('OPTIONS' === req.method) {
    //respond with 200
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
    res.sendStatus(200);
  } else {
    next()
  }
}

export function basicAuthentication(req, res, next) {
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
}

