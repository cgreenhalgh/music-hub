// database
import * as mysql from 'mysql'
import { Account, RoleAssignment, Role, Work } from './types'
import { Capability, hasCapability } from './access'

let pool = mysql.createPool({
  connectionLimit : 10,
  host: "hubdb",
  user: "musichub",
  password: "d2R4dWPtPN4zDIOsUvUyN67Tx98Wo5pu",//
  database: 'musichub'
})

export class AuthenticationError extends Error {
  constructor(m: string) {
    super(m);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

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
        [email], (error, results, fields) => {
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
      let query = 'SELECT `role` FROM `account` WHERE `accountid` = ?'
      let params = [account.id]
      if (workid) {
        query = query+' AND `workdid` = ?'
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
      con.query(query, params, (error, results, fields) => {
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
      let query = 'SELECT `id`, `title`, `year`, `version`, `composer`, `description` FROM `work`'
      con.query(query, (error, results, fields) => {
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
