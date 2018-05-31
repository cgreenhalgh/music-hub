import * as express from 'express'
import * as fs from 'fs'
import * as path from 'path'

import { Work, Download,Capability } from './types'
import { authenticate, getWork } from './db'
import { unauthorized, badrequest, sendError, getDownloadsDirForWork, crossDomainOptions, basicAuthentication } from './utils'
import { hasCapability } from './access'
import { AuthenticationError, PermissionError, NotFoundError } from './exceptions'

const router = express.Router()

// allow cross-domain for testing
router.use(crossDomainOptions)

router.use(basicAuthentication)

// GET download
router.get('/:workid/:filename', (req, res) => {
  var workid
  try { workid = Number(req.params.workid) }
  catch (err) {
    console.log(`get /downloads/${req.params.workid}/{req.params.filename} - not a number`)
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
   // return download
   let downloadsDir = getDownloadsDirForWork(work)
   let file = path.join(downloadsDir, req.params.filename)
   res.sendFile(file)
  })
  .catch((err) => {
    sendError(res, err)
  })
})

router.all('*', (req, res) => {
  res.sendStatus(404)
})
module.exports = router