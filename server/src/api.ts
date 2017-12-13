import * as express from 'express'

import { authenticate, getWork, getWorks, getPerformances, getPerformance, getPerformanceIntegrations, getPerformanceIntegration } from './db'
import { AuthenticationError, PermissionError, NotFoundError } from './exceptions'
import { Capability, hasCapability } from './access'
import { PluginProvider, getPlugin } from './plugins'

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

// allow cross-domain for testing
router.use((req, res, next) => {
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
})

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
  // TODO get roles
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
    res.sendStatus(404)
    return
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
    res.sendStatus(404)
    return
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
// GET performance
router.get('/performance/:performanceid', (req, res) => {
  var performanceid
  try { performanceid = Number(req.params.performanceid) }
  catch (err) {
    console.log(`get /performance/${req.params.performanceid} - not a number`)
    res.sendStatus(404)
    return
  }
  //console.log(`get work ${workid}`)
  getPerformance(req.user, performanceid)
  .then((work) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(work))
  })
  .catch((err) => {
    sendError(res, err)
  })
})

// GET performance integrations
router.get('/performance/:performanceid/integrations', (req, res) => {
  var performanceid
  try { performanceid = Number(req.params.performanceid) }
  catch (err) {
    console.log(`get /performance/${req.params.performanceid}/integrations - not a number`)
    res.sendStatus(404)
    return
  }
  //console.log(`get work ${workid}`)
  getPerformanceIntegrations(req.user, performanceid)
  .then((perfints) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(perfints))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
// GET performance integration
router.get('/performance/:performanceid/integration/:pluginid', (req, res) => {
  var performanceid, pluginid
  try { 
    performanceid = Number(req.params.performanceid);
    pluginid = Number(req.params.pluginid); 
  }
  catch (err) {
    console.log(`get /performance/${req.params.performanceid}/integration/${req.params.pluginid} - not a number`)
    res.sendStatus(404)
    return
  }
  //console.log(`get work ${workid}`)
  getPerformanceIntegration(req.user, performanceid, pluginid)
  .then((perfint) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(perfint))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
// update performance integration
router.post('/performance/:performanceid/integration/:pluginid/update', (req, res) => {
  var performanceid, pluginid
  try { 
    performanceid = Number(req.params.performanceid);
    pluginid = Number(req.params.pluginid); 
  }
  catch (err) {
    console.log(`post /performance/${req.params.performanceid}/integration/${req.params.pluginid} - not a number`)
    res.sendStatus(404)
    return
  }
  getPerformanceIntegration(req.user, performanceid, pluginid)
  .then((perfint) => {
    console.log(`update performance ${perfint.performanceid} plugin ${perfint.pluginid} by ${req.user.email}`)
    // enabled?
    if (!perfint.enabled) {
      res.status(409) // conflict
      res.send('integration is disabled')
      return;
    }
    // extra permission check - capability manage-performance-integration
    // work and performance should be populated by getPerformanceIntegration
    hasCapability(req.user, Capability.ManagePerformanceIntegration, perfint.performance.work, perfint.performance)
    .then((access) => {
      if (!access) {
        sendError(res, new PermissionError('user does not have manage-performance-integration capability'))
        return
      } 
      // actually do something...!
      let plugin = getPlugin(perfint)
      if (!plugin) {
        res.status(500)
        res.send(`Implementation for plugin ${perfint.plugin.code} not found`)
        return
      }
      plugin.update()
      // TODO request-specific return value?
      res.setHeader('Content-type', 'application/json')
      res.send(JSON.stringify({message:'working on it...'}))
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

router.all('*', (req, res) => {
  res.sendStatus(404)
})
module.exports = router