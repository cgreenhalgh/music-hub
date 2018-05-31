import * as express from 'express'
import * as fs from 'fs'

import { Work, Performance, Download, Capability, Account, RoleAssignment, Role } from './types'
import { authenticate, getWork, getWorks, getPerformances, getPerformance, getPerformanceIntegrations, 
  getPerformanceIntegration, getRawRevLinkedPerformanceId, getPerformanceRecordings, putPerformance,
  addPerformanceOfWork, getAccounts, addAccount, getPerformanceRoles, getWorkRoles, setWorkAccountRole,
  setPerformanceAccountRole } from './db'
import { AuthenticationError, PermissionError, NotFoundError, BadRequestError } from './exceptions'
import { hasCapability } from './access'
import { PluginProvider, getPlugin } from './plugins'
import { unauthorized, badrequest, sendError, getDownloadsDirForWork, crossDomainOptions, basicAuthentication } from './utils'

const router = express.Router()


// allow cross-domain for testing
router.use(crossDomainOptions)

router.use(basicAuthentication)

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
    // capabilities: EditWork, CreateWorkPerformance
    work.capabilities = {}
    return hasCapability(req.user, Capability.EditPerformance, work)
    .then((access) => {
      work.capabilities[Capability.EditPerformance] = access
    })
    .then(() => hasCapability(req.user, Capability.CreateWorkPerformance, work))
    .then((access) => {
      work.capabilities[Capability.CreateWorkPerformance] = access
    })
    .then(() => {
      res.setHeader('Content-type', 'application/json')
      res.send(JSON.stringify(work))
    })
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

// GET downloads
router.get('/work/:workid/downloads', (req, res) => {
  var workid
  try { workid = Number(req.params.workid) }
  catch (err) {
    console.log(`get /work/${req.params.workid}/downloads - not a number`)
    res.sendStatus(404)
    return
  }
  getWork(req.user, workid)
  .then((work) => {
    hasCapability(req.user, Capability.DownloadWork, work)
    .then((access) => {
      if (!access) {
        sendError(res, new PermissionError('user does not have download-work capability'))
        return
      } 
    })
   // TODO return downloads
   let downloadsDir = getDownloadsDirForWork(work)
   fs.readdir(downloadsDir, (err,files) => {
     if (err) {
       sendError(res, err)
       return
     }
     let downloads:Download[] = []
     for (let file of files) {
       downloads.push({ filename: file })
     }
     res.setHeader('Content-type', 'application/json')
     res.send(JSON.stringify(downloads))
   })
  })
  .catch((err) => {
    sendError(res, err)
  })
})
function returnPerformance(req, res, performanceid) {
  let ps:Performance[] = []
  //console.log(`get work ${workid}`)
  getPerformance(req.user, performanceid)
  .then((p) => {
    ps.push(p)
    if (p.linked_performanceid!==null)
      return getPerformance(req.user, p.linked_performanceid)
        .then(lp => {ps[0].linked_performance = lp})
  })
  .then(() => {
    return getRawRevLinkedPerformanceId(ps[0])
      .then((lpid) => {
        if (lpid!==null)
          return getPerformance(req.user, lpid)
            .then(lp => {ps[0].rev_linked_performance = lp})
    })
  })
  .then(() => {
    // capabilities: EditPerformance, ManagePerformanceIntegration
    ps[0].capabilities = {}
    return hasCapability(req.user, Capability.EditPerformance, ps[0].work, ps[0])
    .then((access) => {
      ps[0].capabilities[Capability.EditPerformance] = access
    })
  })
  .then(() => {
    return hasCapability(req.user, Capability.ManagePerformanceIntegration, ps[0].work, ps[0])
    .then((access) => {
      ps[0].capabilities[Capability.ManagePerformanceIntegration] = access
    })
  })
  .then(() => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(ps[0]))
   })
  .catch((err) => {
    sendError(res, err)
  })
}
// GET performance
router.get('/performance/:performanceid', (req, res) => {
  var performanceid
  try { performanceid = Number(req.params.performanceid) }
  catch (err) {
    console.log(`get /performance/${req.params.performanceid} - not a number`)
    res.sendStatus(404)
    return
  }
  returnPerformance(req, res, performanceid)
})
// PUT performance
router.put('/performance/:performanceid', (req, res) => {
  var performanceid
  try { performanceid = Number(req.params.performanceid) }
  catch (err) {
    console.log(`put /performance/${req.params.performanceid} - not a number`)
    res.sendStatus(404)
    return
  }
  putPerformance(req.user, performanceid, req.body as Performance)
  .then(() => returnPerformance(req, res, performanceid))
  .catch((err) => {
    sendError(res, err)
  })
})
// POST performance
router.post('/work/:workid/performances', (req, res) => {
  var workid
  try { workid = Number(req.params.workid) }
  catch (err) {
    console.log(`put /work/${req.params.workid}/performances - not a number`)
    res.sendStatus(404)
    return
  }
  addPerformanceOfWork(req.user, req.body as Performance, workid)
  .then((performanceid) => returnPerformance(req, res, performanceid))
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
// GET performance recordings
router.get('/performance/:performanceid/recordings', (req, res) => {
  var performanceid
  try { performanceid = Number(req.params.performanceid) }
  catch (err) {
    console.log(`get /performance/${req.params.performanceid}/recordings - not a number`)
    res.sendStatus(404)
    return
  }
  //console.log(`get work ${workid}`)
  getPerformance(req.user, performanceid)
  .then(performance => 
    getPerformanceRecordings(req.user, performance, performance.work)
    .then((recordings) => {
      res.setHeader('Content-type', 'application/json')
      res.send(JSON.stringify(recordings))
    })
  )
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
    // actually do something...!
    let plugin = getPlugin(perfint)
    if (!plugin) {
      res.status(500)
      res.send(`Implementation for plugin ${perfint.plugin.code} not found`)
      return
    }
    let actions = plugin.getActions()
    perfint.plugin.actions = actions
    perfint.capabilities = {}
    // check capability
    return hasCapability(req.user, Capability.ManagePerformanceIntegration, perfint.performance.work, perfint.performance)
    .then((access) => {
      perfint.capabilities[Capability.ManagePerformanceIntegration] = access
    })
    .then(() => {
      res.setHeader('Content-type', 'application/json')
      res.send(JSON.stringify(perfint))
    })
  })
  .catch((err) => {
    sendError(res, err)
  })
})
// update performance integration
router.post('/performance/:performanceid/integration/:pluginid/:actionid', (req, res) => {
  var performanceid, pluginid, actionid
  try { 
    performanceid = Number(req.params.performanceid);
    pluginid = Number(req.params.pluginid); 
  }
  catch (err) {
    console.log(`post /performance/${req.params.performanceid}/integration/${req.params.pluginid}/... - not a number`)
    res.sendStatus(404)
    return
  }
  actionid = req.params.actionid
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
      plugin.doAction(actionid)
      .then((result) => {
        res.setHeader('Content-type', 'application/json')
        res.send(JSON.stringify(result))
      })
      .catch((err) => {
        sendError(res, err)
      })
    })
  })
  .catch((err) => {
    sendError(res, err)
  })
})
// GET accounts
router.get('/accounts', (req, res) => {
  getAccounts(req.user)
  .then((accounts) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(accounts))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
router.get('/capability/:capability', (req, res) => {
  hasCapability(req.user, req.params.capability, null, null)
  .then((access) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(access))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
router.get('/work/:workid/capability/:capability', (req, res) => {
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
    return hasCapability(req.user, req.params.capability, work, null)
    .then((access) => {
      res.setHeader('Content-type', 'application/json')
      res.send(JSON.stringify(access))
    })
  })
  .catch((err) => {
    sendError(res, err)
  })
})
router.get('/performance/:performanceid/capability/:capability', (req, res) => {
  var performanceid
  try { performanceid = Number(req.params.performanceid) }
  catch (err) {
    console.log(`get /work/${req.params.performanceid} - not a number`)
    res.sendStatus(404)
    return
  }
  //console.log(`get work ${workid}`)
  getPerformance(req.user, performanceid)
  .then((performance) => {
    return hasCapability(req.user, req.params.capability, performance.work, performance)
    .then((access) => {
      res.setHeader('Content-type', 'application/json')
      res.send(JSON.stringify(access))
    })
  })
  .catch((err) => {
    sendError(res, err)
  })
})
// POST accounts
router.post('/accounts', (req, res) => {
  addAccount(req.user, req.body as Account)
  .then((accountid) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(accountid))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
// GET performance roles
router.get('/performance/:performanceid/roles', (req, res) => {
  var performanceid
  try { performanceid = Number(req.params.performanceid) }
  catch (err) {
    console.log(`get /performance/${req.params.performanceid}/roles - not a number`)
    res.sendStatus(404)
    return
  }
  //console.log(`get work ${workid}`)
  getPerformanceRoles(req.user, performanceid)
  .then(ras => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(ras))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
// GET performance roles
router.get('/work/:workid/roles', (req, res) => {
  var workid
  try { workid = Number(req.params.workid) }
  catch (err) {
    console.log(`get /work/${req.params.performanceid}/roles - not a number`)
    res.sendStatus(404)
    return
  }
  //console.log(`get work ${workid}`)
  getWorkRoles(req.user, workid)
  .then(ras => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(ras))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
router.put('/work/:workid/account/:accountid/role/:roleid', (req, res) => {
  var workid
  try { workid = Number(req.params.workid) }
  catch (err) {
    console.log(`workid ${req.params.workid} - not a number`)
    res.sendStatus(404)
    return
  }
  var accountid
  try { accountid = Number(req.params.accountid) }
  catch (err) {
    console.log(`accountid ${req.params.accountid} - not a number`)
    res.sendStatus(404)
    return
  }
  var roleid = req.params.roleid
  if (Role.Owner!=roleid && Role.Performer!=roleid) {
    console.log('role '+roleid+' not valid for work')
    res.sendStatus(400)
    return
  }
  if (!req.body || typeof(req.body.grant) != 'boolean') {
    console.log('put role body not {grant:boolean}', req.body)
    res.sendStatus(400)
    return
  }
  setWorkAccountRole(req.user, workid, accountid, roleid, req.body.grant as boolean)
  .then((changed) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(changed))
  })
  .catch((err) => {
    sendError(res, err)
  })
})
router.put('/performance/:performanceid/account/:accountid/role/:roleid', (req, res) => {
  var performanceid
  try { performanceid = Number(req.params.performanceid) }
  catch (err) {
    console.log(`workid ${req.params.performanceid} - not a number`)
    res.sendStatus(404)
    return
  }
  var accountid
  try { accountid = Number(req.params.accountid) }
  catch (err) {
    console.log(`accountid ${req.params.accountid} - not a number`)
    res.sendStatus(404)
    return
  }
  var roleid = req.params.roleid
  if (Role.PerformanceManager!=roleid) {
    console.log('role '+roleid+' not valid for work')
    res.sendStatus(400)
    return
  }
  if (!req.body || typeof(req.body.grant) != 'boolean') {
    console.log('put role body not {grant:boolean}', req.body)
    res.sendStatus(400)
    return
  }
  setPerformanceAccountRole(req.user, performanceid, accountid, roleid, req.body.grant as boolean)
  .then((changed) => {
    res.setHeader('Content-type', 'application/json')
    res.send(JSON.stringify(changed))
  })
  .catch((err) => {
    sendError(res, err)
  })
})

router.all('*', (req, res) => {
  res.sendStatus(404)
})
module.exports = router