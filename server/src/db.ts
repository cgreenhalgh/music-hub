// database
import * as mysql from 'mysql'
import {Account} from './types'

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