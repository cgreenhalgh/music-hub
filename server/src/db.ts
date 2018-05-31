// database
import * as mysql from 'mysql'
import { Account, RoleAssignment, Role, Work, Performance, Plugin, PluginSetting, PerformanceIntegration, Recording, Capability } from './types'
import { hasCapability } from './access'
import { AuthenticationError, PermissionError, NotFoundError, BadRequestError } from './exceptions'

let password = process.env['MUSICHUB_PASSWORD']
if (!password || password.length==0) {
  console.log(`ERROR: MUSICHUB_PASSWORD not defined`)
  password = "d2R4dWPtPN4zDIOsUvUyN67Tx98Wo5pu"
}

let pool = mysql.createPool({
  connectionLimit : 10,
  host: "hubdb",
  user: "musichub",
  password: password,
  database: 'musichub'
})

export function authenticate(email:string, password:string) : Promise<Account> {
  return new Promise((resolve,reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      con.query('SELECT `id`, `email`, `passwordhash`, `nickname`, `description` FROM `account` WHERE `email` = ?',
        [email], (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          if (results.length==0) {
            reject(new AuthenticationError(`User ${email} not found`))
            return
          }
          //console.log(`User ${email} found`, results[0])
          // TODO hash
          if (!password || password!=results[0].passwordhash) {
            reject(new AuthenticationError(`User ${email} password does not match`)) // ${password} vs ${results[0].passwordhash}`))
            return
          }
          let account:Account = {
            id: results[0].id,
            email: results[0].email,
            nickname: results[0].nickname,
            description: results[0].description
          }
          resolve(account)
      })
    })
  })
}

export function addAccount(account:Account, newAccount:Account) : Promise<number> {
  return new Promise((resolve,reject) => {
    hasCapability(account, Capability.CreateAccount, null, null)
    .then((access) => {
      if (!access) {
        reject(new PermissionError(`user cannot create account`))
        return
      }
      pool.getConnection((err, con) => {
        if (err) {
          console.log(`Error getting connection: ${err.message}`)
          reject(err)
          return
        }
        // Use the connection
        // INSERT
        let insert  = 'INSERT INTO `account` (`nickname`, `description`, '+
                  '`email`, `passwordhash`) VALUES ( ?, ?, ?, ?)'
        // not (yet) a hash?!
        let params = [newAccount.nickname, newAccount.description,
          newAccount.email, newAccount.password]
        con.query(insert, params, (err, result) => {
          con.release()
          if (err) {
            console.log(`Error doing addAccount insert: ${err.message}`)
            reject(new BadRequestError(err.message))
            return
          }
          // return new id
          console.log('added account '+result.insertId)
          resolve(result.insertId)
        })
      })
    })
    .catch((err) => {
      reject(err)
    })
  })
}

export function getRoles(account:Account, workid?: number, performanceid?: number) : Promise<string[]> {
  return new Promise((resolve,reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT `role` FROM `role` WHERE `accountid` = ?'
      let params = [account.id]
      if (workid) {
        query = query+' AND `workid` = ?'
        params.push(workid)
      } else {
        query = query+' AND ISNULL(`workid`)'
      }
      if (performanceid) {
        query = query+' AND `performanceid` = ?'
        params.push(performanceid)
      } else {
        query = query+' AND ISNULL(`performanceid`)'
      }
      con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getRoles select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          let roles:Role[] = results.map((r) => { return r.role as Role; })
          resolve(roles)
      })
    })
  })
}

export function getPerformanceRoles(account:Account, performanceid: number) : Promise<RoleAssignment[]> {
  return new Promise((resolve,reject) => {
    getPerformance(account, performanceid)
    .then((performance) => {
      hasCapability(account, Capability.EditRolesPerformance, performance.work, performance)
      .then((access) => {
        if (!access) {
          reject(new PermissionError(`cannot edit roles in performance`))
          return
        }
        pool.getConnection((err, con) => {
          if (err) {
            console.log(`Error getting connection: ${err.message}`)
            reject(err)
            return
          }
          // Use the connection
          let query = 'SELECT * FROM `role` WHERE `performanceid` = ?'
          let params = [performanceid]
          con.query(query, params, (err, results, fields) => {
            if (err) {
              con.release()
              console.log(`Error doing getPerformanceRoles select: ${err.message}`)
              reject(err)
              return
            }
            con.release()
            let ras:RoleAssignment[] = results.map((r) => { return r as RoleAssignment; })
            let ps:Promise<void>[] = ras.map((ra) => { return getAccount(account, ra.accountid).then((ac) => {ra.account = ac}) })
            Promise.all(ps)
            .then(() => resolve(ras))
            .catch(err => reject(err))
          })
        })
      })
      .catch(err => reject(err))
    })
    .catch(err => reject(err))
  })
}
export function getWorkRoles(account:Account, workid: number) : Promise<RoleAssignment[]> {
  return new Promise((resolve,reject) => {
    getWork(account, workid)
    .then((work) => {
      hasCapability(account, Capability.EditRolesWork, work)
      .then((access) => {
        if (!access) {
          reject(new PermissionError(`cannot edit roles in work`))
          return
        }
        pool.getConnection((err, con) => {
          if (err) {
            console.log(`Error getting connection: ${err.message}`)
            reject(err)
            return
          }
          // Use the connection
          let query = 'SELECT * FROM `role` WHERE `workid` = ? AND ISNULL(`performanceid`)'
          let params = [workid]
          con.query(query, params, (err, results, fields) => {
            if (err) {
              con.release()
              console.log(`Error doing getPerformanceRoles select: ${err.message}`)
              reject(err)
              return
            }
            con.release()
            let ras:RoleAssignment[] = results.map((r) => { return r as RoleAssignment; })
            let ps:Promise<void>[] = ras.map((ra) => { return getAccount(account, ra.accountid).then((ac) => {ra.account = ac}) })
            Promise.all(ps)
            .then(() => resolve(ras))
            .catch(err => reject(err))
          })
        })
      })
      .catch(err => reject(err))
    })
    .catch(err => reject(err))
  })
}
export function setWorkAccountRole(account:Account, workid: number, accountid: number, role: string, grant:boolean) : Promise<boolean> {
  return new Promise((resolve,reject) => {
    getWork(account, workid)
    .then((work) => {
      hasCapability(account, Capability.EditRolesWork, work)
      .then((access) => {
        if (!access) {
          reject(new PermissionError(`cannot edit roles in work`))
          return
        }
        pool.getConnection((err, con) => {
          if (err) {
            console.log(`Error getting connection: ${err.message}`)
            reject(err)
            return
          }
          if (!grant) {
            // remove
            let query = 'DELETE FROM `role` WHERE `workid` = ? AND `accountid` = ? AND `role` = ? AND ISNULL(`performanceid`)'
            let params = [workid, accountid, role]
            con.query(query, params, (err, results, fields) => {
              con.release()
              if (err) {
                console.log(`Error doing setWorkAccountRole delete: ${err.message}`)
                reject(err)
                return
              }
              resolve(results.affectedRows!=0)
            })
            return;
          }
          // check/add
          let query = 'SELECT `role` FROM `role` WHERE `workid` = ? AND `accountid` = ? AND `role` = ? AND ISNULL(`performanceid`)'
          let params = [workid, accountid, role]
          con.query(query, params, (err, results, fields) => {
            if (err) {
              con.release()
              console.log(`Error doing setWorkAccountRole select: ${err.message}`)
              reject(err)
              return
            }
            if (results.length==0) {
              let query = 'INSERT INTO `role` ( `role`, `workid`, `accountid`, `performanceid`) VALUES ( ?, ?, ?, NULL )'
              let params = [role, workid, accountid]
              con.query(query, params, (err, results, fields) => {
                con.release()
                if (err) {
                  console.log(`Error doing setWorkAccountRole insert: ${err.message}`)
                  reject(err)
                  return
                }
                resolve(true)
              })
              return;
            }
            con.release()
            resolve(false)
          })
        })
      })
      .catch(err => reject(err))
    })
    .catch(err => reject(err))
  })
}
export function setPerformanceAccountRole(account:Account, performanceid: number, accountid: number, role: string, grant:boolean) : Promise<boolean> {
  return new Promise((resolve,reject) => {
    getPerformance(account, performanceid)
    .then((performance) => {
      hasCapability(account, Capability.EditRolesPerformance, performance.work, performance)
      .then((access) => {
        if (!access) {
          reject(new PermissionError(`cannot edit roles in performance`))
          return
        }
        pool.getConnection((err, con) => {
          if (err) {
            console.log(`Error getting connection: ${err.message}`)
            reject(err)
            return
          }
          if (!grant) {
            // remove
            let query = 'DELETE FROM `role` WHERE `workid` = ? AND `accountid` = ? AND `role` = ? AND `performanceid` = ?'
            let params = [performance.workid, accountid, role, performanceid]
            con.query(query, params, (err, results, fields) => {
              con.release()
              if (err) {
                console.log(`Error doing setWorkAccountPerformance delete: ${err.message}`)
                reject(err)
                return
              }
              resolve(results.affectedRows!=0)
            })
            return;
          }
          // check/add
          let query = 'SELECT `role` FROM `role` WHERE `workid` = ? AND `accountid` = ? AND `role` = ? AND `performanceid` = ?'
          let params = [performance.workid, accountid, role, performanceid]
          con.query(query, params, (err, results, fields) => {
            if (err) {
              con.release()
              console.log(`Error doing setWorkAccountPerformance select: ${err.message}`)
              reject(err)
              return
            }
            if (results.length==0) {
              let query = 'INSERT INTO `role` ( `role`, `workid`, `accountid`, `performanceid`) VALUES ( ?, ?, ?, ? )'
              let params = [role, performance.workid, accountid, performanceid]
              con.query(query, params, (err, results, fields) => {
                con.release()
                if (err) {
                  console.log(`Error doing setWorkAccountPerformance insert: ${err.message}`)
                  reject(err)
                  return
                }
                resolve(true)
              })
              return;
            }
            con.release()
            resolve(false)
          })
        })
      })
      .catch(err => reject(err))
    })
    .catch(err => reject(err))
  })
}
export function getWorks(account:Account) : Promise<Work[]> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `work`'
      con.query(query, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getWorks select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          let works:Work[] = results.map((r) => r as Work)
          let accessps:Promise<boolean>[] = works.map((work) => hasCapability(account, Capability.ViewWork, work))
          Promise.all(accessps).then(accesses => {
            let fworks:Work[] = []
            for (let i in works) {
              if (accesses[i]) {
                fworks.push(works[i])
              }
            }
            resolve(fworks)
          })
          .catch((err) => {
            console.log(`Error checking access to works: ${err.message}`, err)
            reject(err)
          })
      })
    })
    
  })
}
export function getWork(account:Account, workid:number) : Promise<Work> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `work` WHERE `id` = ?'
      let params = [workid]
      con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getWork select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          if (results.length==0) {
            reject(new NotFoundError(`work ${workid} not found`))
            return
          }
          let work:Work = results[0] as Work
          hasCapability(account, Capability.ViewWork, work)
          .then((access) => {
            if (access) {
              resolve(work)
            } else {
              reject(new PermissionError(`work ${workid} not accessible to ${account.email}`))
            }
          })
          .catch((err) => {
            console.log(`Error checking access to work ${workid}: ${err.message}`, err)
            reject(err)
          })
      })
    })
    
  })
}

function bit2boolean(bit:any) : boolean {
  if (bit===null)
    return null
  if (bit)
    return true
  return false
}
function mapPerformance(result:any) : Performance {
  if (!result)
    return null
  let ispublic = result.public
  delete result.public
  let perf:Performance = result as Performance
  perf.ispublic = bit2boolean(ispublic)
  if ((perf.date as any) instanceof Date) {
    // Date?!
    perf.date = (perf.date as any).toISOString().slice(0, 10) 
  }
  return perf
}

export function getPerformances(account:Account, work:Work) : Promise<Performance[]> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `performance` WHERE `workid` = ?'
      let params = [work.id]
      con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getPerformances select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          let perfs:Performance[] = results.map((r) => mapPerformance(r))
          let accessps:Promise<boolean>[] = perfs.map((perf) => hasCapability(account, Capability.ViewPerformance, work, perf))
          Promise.all(accessps).then((accesses) => {
            let fperfs:Performance[] = []
            for (let i in perfs) {
              if (accesses[i]) {
                fperfs.push(perfs[i])
              }
            }
            resolve(fperfs)
          })
          .catch((err) => {
            console.log(`Error checking access to performances: ${err.message}`, err)
            reject(err)
          })
      })
    })
    
  })
}

export function getPerformance(account:Account, performanceid:number) : Promise<Performance> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `performance` WHERE `id` = ?'
      let params = [performanceid]
      con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getPerformance select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          if (results.length==0) {
            reject(new NotFoundError(`performance ${performanceid} not found`))
            return
          }
          let perf:Performance = mapPerformance(results[0])
          getWork(account, perf.workid)
          .then((work) => {
            perf.work = work;
            return hasCapability(account, Capability.ViewPerformance, work, perf)
            .then((access) => {
              if (access) {
                resolve(perf)
              } else {
                reject(new PermissionError(`performance ${performanceid} not accessible to ${account.email}`))
              }
            })
          })
          .catch((err) => {
            console.log(`Error checking access to performance ${performanceid} of work ${perf.workid}: ${err.message}`, err)
            reject(err)
          })
      })
    })
    
  })
}
export function putPerformance(account:Account, performanceid:number, performance:Performance) : Promise<void> {
  return new Promise((resolve, reject) => {
    // will update validate??
    if (performance.id != performanceid) {
      reject(new BadRequestError('id does not match for performance'))
      return
    }
/*
    // validate new value
    if (!performance.title) {
      reject(new BadRequestError('title required for performance'))
      return
    }
    //description TEXT,
    if (!performance.performer_title) {
      reject(new BadRequestError('performer_title required for performance'))
      return
    }
    if (!performance.performer_title) {
      reject(new BadRequestError('performer_title required for performance'))
      return
    }
    //performer_bio TEXT,
    if (!performance.venue_title) {
      reject(new BadRequestError('venue_title required for performance'))
      return
    }
    if (!performance.location) {
      reject(new BadRequestError('location required for performance'))
      return
    }
    //date DATE,
    //time TIME,
    //timezone VARCHAR(20),
    if (performance.public===null || performance.public===undefined) {
      reject(new BadRequestError('public required for performance'))
      return
    }
    if (!performance.status) {
      reject(new BadRequestError('public required for performance'))
      return
    }
*/
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      // check workid
      let query = 'SELECT * FROM `performance` WHERE `id` = ?'
      let params = [performanceid]
      con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getPerformance select: ${err.message}`)
            reject(err)
            return
          }
          if (results.length==0) {
            con.release()
            reject(new NotFoundError(`performance ${performanceid} not found`))
            return
          }
          let perf:Performance = mapPerformance(results[0])
          getWork(account, perf.workid)
          .then((work) => {
            return hasCapability(account, Capability.EditPerformance, work, perf)
            .then((access) => {
              if (access) {
                // UPDATE
                let update = 'UPDATE `performance` SET `title` = ?, `description` = ?, '+
                  '`performer_title` = ?, `performer_bio` = ?, `location` = ?, '+
                  '`venue_title` = ?, `date` = ?, `time` = ?, `timezone` = ?, '+
                  '`public` = ?, `status` = ?, `linked_performanceid` = ? '+
                  ' WHERE `id` = ?'
                let params = [performance.title, performance.description, 
                    performance.performer_title, performance.performer_bio, performance.location,
                    performance.venue_title, (""==performance.date ? null : performance.date), 
                    (""==performance.time ? null : performance.time), performance.timezone,
                    performance.ispublic ? 1 : 0, performance.status, performance.linked_performanceid,
                    performanceid]
                con.query(update, params, (err) => {
                  con.release()
                  if (err) {
                    console.log(`Error doing putPerformance update: ${err.message}`)
                    reject(new BadRequestError(err.message))
                    return
                  }
                  resolve()
                })
              } else {
                con.release()
                reject(new PermissionError(`performance ${performanceid} not editable by ${account.email}`))
              }
            })
          })
          .catch((err) => {
            con.release()
            console.log(`Error checking access to performance ${performanceid} of work ${perf.workid}: ${err.message}`, err)
            reject(err)
          })
      })
    })
    
  })
}
export function addPerformanceOfWork(account:Account, performance:Performance, workid:number) : Promise<number> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      // get the work
      let query = 'SELECT * FROM `work` WHERE `id` = ?'
      let params = [workid]
      con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing addPerformanceOfWork/getWork select: ${err.message}`)
            reject(err)
            return
          }
          if (results.length==0) {
            con.release()
            reject(new NotFoundError(`work ${workid} not found`))
            return
          }
          let work:Work = results[0] as Work
          // check permission to add
          hasCapability(account, Capability.CreateWorkPerformance, work)
          .then((access) => {
            if (access) {
              // INSERT
              let insert  = 'INSERT INTO `performance` (`title`, `description`, '+
                  '`performer_title`, `performer_bio`, `location`, '+
                  '`venue_title`, `date`, `time`, `timezone`, '+
                  '`public`, `status`, `linked_performanceid`, '+
                  '`workid`) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )'
              let params = [performance.title, performance.description, 
                    performance.performer_title, performance.performer_bio, performance.location,
                    performance.venue_title, (""==performance.date ? null : performance.date), 
                    (""==performance.time ? null : performance.time), performance.timezone,
                    performance.ispublic ? 1 : 0, performance.status, performance.linked_performanceid,
                    work.id]
              con.query(insert, params, (err, result) => {
                con.release()
                if (err) {
                  console.log(`Error doing addPerformanceOfWork update: ${err.message}`)
                  reject(new BadRequestError(err.message))
                  return
                }
                // return new id
                console.log('added performance '+result.insertId)
                resolve(result.insertId)
              })
            } else {
              con.release()
              reject(new PermissionError(`work ${workid} performances cannot be added by ${account.email}`))
            }
          })
          .catch((err) => {
            con.release()
            console.log(`Error checking access to work ${workid}: ${err.message}`, err)
            reject(err)
          })
      })
    })
  })
}

// low-level - no security
export function getRawPerformance(performanceid:number) : Promise<Performance> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `performance` WHERE `id` = ?'
      let params = [performanceid]
      con.query(query, params, (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing getPerformance select: ${err.message}`)
          reject(err)
          return
        }
        con.release()
        if (results.length==0) {
          reject(new NotFoundError(`performance ${performanceid} not found`))
          return
        }
        let perf:Performance = mapPerformance(results[0])
        // work?
        resolve(perf)
      })
    })
    
  })
}
// low-level - no security
// one level only
// TODO multiple?
export function getRawRevLinkedPerformanceId(performance:Performance) : Promise<number> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT id FROM `performance` WHERE `linked_performanceid` = ?'
      let params = [performance.id]
      con.query(query, params, (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing getRawRevLinkedPerformances1 select: ${err.message}`)
          reject(err)
          return
        }
        con.release()
        if (results.length==0)
          resolve(null)
        else
          resolve(results[0].id)
      })
    })
    
  })
}
function mapRecording(result:any) : Recording {
  if (!result)
    return null
  let ispublic = result.public
  delete result.public
  let rec:Recording = result as Recording
  rec.ispublic = bit2boolean(ispublic)
  return rec
}
export function getPerformanceRecordings(account:Account, performance:Performance, work:Work) : Promise<Recording[]> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `recording` WHERE `performanceid` = ?'
      let params = [performance.id]
      con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getRecordings select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          let recs:Recording[] = results.map((r) => mapRecording(r))
          let accessps:Promise<boolean>[] = recs.map((rec) => hasCapability(account, Capability.ViewRecording, work, performance, null, rec))
          Promise.all(accessps).then((accesses) => {
            let frecs:Recording[] = []
            for (let i in recs) {
              if (accesses[i]) {
                frecs.push(recs[i])
              }
            }
            resolve(frecs)
          })
          .catch((err) => {
            console.log(`Error checking access to recordings: ${err.message}`, err)
            reject(err)
          })
      })
    })
    
  })
}
export function getRawRecordings(performanceid:number) : Promise<Recording[]> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `recording` WHERE `performanceid` = ?'
      let params = [performanceid]
      con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getRawRecordings select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          let recs:Recording[] = results.map((r) => mapRecording(r))
          resolve(recs)
      })
    })
  })
}


function mapPerformanceIntegration(result:any) : PerformanceIntegration {
  if (!result)
    return null
  let perfint:PerformanceIntegration = result as PerformanceIntegration
  perfint.enabled = bit2boolean(perfint.enabled)
  return perfint
}
export function getPerformanceIntegrations(account:Account, performanceid:number) : Promise<PerformanceIntegration[]> {
  return new Promise((resolve, reject) => {
    getPerformance(account, performanceid)
    .then((performance) => {
      // any extra permission check beyond view performance??
      pool.getConnection((err, con) => {
        if (err) {
          console.log(`Error getting connection: ${err.message}`)
          reject(err)
          return
        }
        // Use the connection
        let query = 'SELECT * FROM `performance_integration` WHERE `performanceid` = ?'
        let params = [performanceid]
        con.query(query, params, (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getPerformanceIntegrations select: ${err.message}`)
            reject(err)
            return
          }
          let perfints:PerformanceIntegration[] = results.map((r) => mapPerformanceIntegration(r))
          // add plugins (objects)
          con.query('SELECT * FROM `plugin`', (err, results, fields) => {
            if (err) {
              con.release()
              console.log(`Error doing plugin select: ${err.message}`)
              reject(err)
              return
            }
            con.release()
            let allperfints:PerformanceIntegration[] = []
            let plugins: Plugin[] = results.map((r) => r as Plugin)
            for (let perfint of perfints) {
              let plugin = plugins.find((p) => p.id == perfint.pluginid)
              perfint.plugin = plugin
              allperfints.push(perfint)
            }
            // add other plugins as 'disabled' integrations
            for (let plugin of plugins) {
              let perfint = perfints.find((pi) => pi.pluginid == plugin.id)
              if (!perfint) {
                let perfint:PerformanceIntegration = {
                  id:0, // ??? hack ???
                  performanceid: performanceid,
                  pluginid: plugin.id,
                  plugin: plugin,
                  enabled: false,
                  guid: null
                }
                allperfints.push(perfint)
              }
            }
            resolve(perfints)
          })
        })
      })
    })
    .catch((err) => reject(err))
  })
}
// no perm check here - low-level
function getRawPlugin(pluginid:number): Promise<Plugin> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `plugin` WHERE `id` = ?'
      let params = [pluginid]
      con.query(query, params, (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing getPlugin select: ${err.message}`)
          reject(err)
          return
        }
        if (results.length==0) {
          con.release()
          reject(new NotFoundError(`plugin ${pluginid} not found`))
          return
        }
        let plugin:Plugin = results[0] as Plugin
        // settings
        con.query('SELECT `name`, `value` FROM `plugin_setting` WHERE `pluginid` = ?', [pluginid], (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing getPlugin select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          plugin.settings = results.map((s) => s as PluginSetting)
          resolve(plugin)
        })
      })
    })
  })
}
// no perm check here - low-level
export function getRawPluginSetting(pluginid:number, name:string): Promise<string> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      con.query('SELECT (`value`) FROM `plugin_setting` WHERE `pluginid` = ? AND `name` = ?', [pluginid, name], (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing getPluginSetting select: ${err.message}`)
          reject(err)
          return
        }
        con.release()
        //console.log('getRawPluginSetting', results)
        if (results.length==0) {
          resolve(null)
          return 
        }
        resolve(results[0].value)
      })
    })
  })
}
// no perm check here - low-level
export function getRawPerformanceIntegrationSetting(perfintid:number, name:string): Promise<string> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      con.query('SELECT (`value`) FROM `performance_integration_setting` WHERE `perfintid` = ? AND `name` = ?', [perfintid, name], (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing getPerformanceIntegrationSetting select: ${err.message}`)
          reject(err)
          return
        }
        con.release()
        //console.log('getRawPluginSetting', results)
        if (results.length==0) {
          resolve(null)
          return 
        }
        resolve(results[0].value)
      })
    })
  })
}
// no perm check here - low-level
export function setRawPerformanceIntegrationSetting(perfintid:number, pluginid:number, performanceid:number, name:string, value:string): Promise<void> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      con.query('SELECT (`id`) FROM `performance_integration_setting` WHERE `perfintid` = ? AND `name` = ?', [perfintid, name], (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing setPerformanceIntegrationSetting select: ${err.message}`)
          reject(err)
          return
        }
        if (results.length==0) {
          con.query('INSERT `performance_integration_setting` (`perfintid`, `performanceid`, `pluginid`, `name`, `value`) VALUES (?,?,?,?,?)', [perfintid, performanceid, pluginid, name, value], (err) => {
            con.release()
            if (err) {
              console.log(`Error doing setPerformanceIntegrationSetting insert: ${err.message}`)
              reject(err)
              return
            }
            resolve()
            return 
          })
        } else {
          con.query('UPDATE `performance_integration_setting` SET `value` = ? WHERE `perfintid` = ? AND `name` = ?', [value, perfintid, name], (err) => {
            con.release()
            if (err) {
              console.log(`Error doing setPerformanceIntegrationSetting update: ${err.message}`)
              reject(err)
              return
            }
            resolve()
            return 
          })
        }
      })
    })
  })
}

export function getPerformanceIntegration(account:Account, performanceid:number, pluginid:number) : Promise<PerformanceIntegration> {
  return new Promise((resolve, reject) => {
    getPerformance(account, performanceid)
    .then((performance) => {
      return getRawPlugin(pluginid)
      .then((plugin) => {
        // any extra permission check beyond view performance??
        pool.getConnection((err, con) => {
          if (err) {
            console.log(`Error getting connection: ${err.message}`)
            reject(err)
            return
          }
          // Use the connection
          let query = 'SELECT * FROM `performance_integration` WHERE `performanceid` = ? AND `pluginid` = ?'
          let params = [performanceid, pluginid]
          con.query(query, params, (err, results, fields) => {
            if (err) {
              con.release()
              console.log(`Error doing getPerformanceIntegration select: ${err.message}`)
              reject(err)
              return
            }
            if (results.length==0) {
              con.release()
              // fake / disabled
              let perfint:PerformanceIntegration = {
                id:0, // ??? hack ???
                performanceid: performanceid,
                performance: performance,
                pluginid: plugin.id,
                plugin: plugin,
                enabled: false,
                guid: null
              }
              resolve(perfint)
              return
            }
            let perfint:PerformanceIntegration = mapPerformanceIntegration(results[0])
            perfint.plugin = plugin
            perfint.performance = performance
            // settings
            con.query('SELECT `name`, `value` FROM `performance_integration_setting` WHERE `perfintid` = ?', [perfint.id], (err, results, fields) => {
              if (err) {
                con.release()
                console.log(`Error doing getPerformanceIntegration select: ${err.message}`)
                reject(err)
                return
              }
              con.release()
              perfint.settings = results.map((s) => s as PluginSetting)
              resolve(perfint)
            })
          })
        })
      })
    })
    .catch((err) => reject(err))
  })
}
// low-level - internal - no security
export function getRawPerformanceIntegration(perfintid:number) : Promise<PerformanceIntegration> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `performance_integration` WHERE `id` = ?'
      let params = [perfintid]
      con.query(query, params, (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing getRawPerformanceIntegration select: ${err.message}`)
          reject(err)
          return
        }
        con.release()
        if (results.length==0) {
          resolve(null)
        }
        let perfint:PerformanceIntegration = mapPerformanceIntegration(results[0])
        resolve(perfint)
      })
    })
  })
}
// low-level - internal - no security
export function getRawPerformanceIntegration2(pluginid:number, performanceid:number) : Promise<PerformanceIntegration> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      let query = 'SELECT * FROM `performance_integration` WHERE `performanceid` = ? AND `pluginid` = ?'
      let params = [performanceid, pluginid]
      con.query(query, params, (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing getRawPerformanceIntegration select: ${err.message}`)
          reject(err)
          return
        }
        con.release()
        if (results.length==0) {
          resolve(null)
        }
        let perfint:PerformanceIntegration = mapPerformanceIntegration(results[0])
        resolve(perfint)
      })
    })
  })
}
// low-level - internal - no security
export function getRawPerformanceIntegrationsForSetting(pluginid:number, setting:string, value:string) : Promise<PerformanceIntegration[]> {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      con.query('SELECT `perfintid` FROM `performance_integration_setting` WHERE `pluginid` = ? AND `name` = ? AND `value` = ?', [pluginid, setting, value], (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing getRawPerformanceIntegrationsForPlugin select: ${err.message}`)
          reject(err)
          return
        }
        con.release()
        let perfintps:Promise<PerformanceIntegration>[] = results.map((r) => getRawPerformanceIntegration(r.perfintid as number))
        Promise.all(perfintps)
        .then(perfints => resolve(perfints))
        .catch(err => reject(err))
      })
    })
  })
}

export function getAccounts(account:Account) : Promise<Account[]> {
  return new Promise((resolve,reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      con.query('SELECT `id`, `email`, `nickname`, `description` FROM `account`',
        [], (err, results, fields) => {
          if (err) {
            con.release()
            console.log(`Error doing select: ${err.message}`)
            reject(err)
            return
          }
          con.release()
          let accounts:Account[] = results.map((r) => r as Account)
          resolve(accounts)
      })
    })
  })
}
export function getAccount(account:Account, accountid:number) : Promise<Account> {
  return new Promise((resolve,reject) => {
    pool.getConnection((err, con) => {
      if (err) {
        console.log(`Error getting connection: ${err.message}`)
        reject(err)
        return
      }
      // Use the connection
      con.query('SELECT `id`, `email`, `nickname`, `description` FROM `account` WHERE `id` = ?',
        [accountid], (err, results, fields) => {
        if (err) {
          con.release()
          console.log(`Error doing select: ${err.message}`)
          reject(err)
          return
        }
        con.release()
        if (results.length==0) {
          reject(new NotFoundError(`account ${accountid} not found`))
          return
        }
        resolve(results[0] as Account)
      })
    })
  })
}