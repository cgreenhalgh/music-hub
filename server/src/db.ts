// database
import * as mysql from 'mysql'
import { Account, RoleAssignment, Role, Work, Performance, Plugin, PluginSetting, PerformanceIntegration } from './types'
import { Capability, hasCapability } from './access'
import { AuthenticationError, PermissionError, NotFoundError } from './exceptions'

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
        // TODO settings
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
            con.release()
            if (results.length==0) {
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
            resolve(perfint)
            return
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
