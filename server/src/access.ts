import { Account, Work, Performance, Role, Recording, Capability } from './types'
import { getRoles } from './db'
//import { PermissionError } from './exceptions'
// access control

export function hasCapability(account:Account, capability:Capability, work?:Work, performance?:Performance, onaccount?:Account, recording?:Recording): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (Capability.CreateAccount==capability || Capability.ManageAccount==capability) {
      // admin-only
      getRoles(account, null, null)
      .then((roles) => {
        if (roles.indexOf(Role.Admin)>=0) {
          resolve(true)
          return
        } else {
          //reject(new PermissionError(`${account.email} does not have Admin rights`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    }
    else if (Capability.EditAccount==capability) {
      // admin or account
      if (!onaccount) {
        //reject(new PermissionError(`Edit account not specified`))
        resolve(false)
        return
      }
      if (account.id==onaccount.id) {
        resolve(true)
        return
      }
      getRoles(account, null, null)
      .then((roles) => {
        if (roles.indexOf(Role.Admin)>=0) {
          resolve(true)
          return
        } else {
          //reject(new PermissionError(`${account.email} does not have Admin rights`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    }
    else if (Capability.ViewAccount==capability) {
      // anyone?!
      resolve(true)
    } else if (Capability.CreateWork==capability) {
      // admin or publisher
      getRoles(account, null, null)
      .then((roles) => {
        if (roles.indexOf(Role.Admin)>=0 || roles.indexOf(Role.Publisher)>=0) {
          resolve(true)
          return
        } else {
          //reject(new PermissionError(`${account.email} does not have Admin or publisher rights`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    } else if (Capability.EditWork==capability || Capability.DownloadWork==capability || Capability.EditRolesWork==capability || Capability.CreateWorkPerformance==capability || Capability.EditRolesPerformance==capability) {
      // owner?
      if (!work) {
        //reject(new PermissionError(`Edit work not specified`))
        resolve(false)
        return
      }
      getRoles(account, work.id, null)
      .then((roles) => {
        if (roles.indexOf(Role.Owner)>=0) {
          resolve(true)
          return
        } else if (Capability.DownloadWork==capability && roles.indexOf(Role.Performer)>=0) {
          // performer can download
          resolve(true)
        } else {
          //reject(new PermissionError(`${account.email} does not have Owner rights on ${work.title}`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    } else if (Capability.ViewWork==capability) {
      // anyone! (for now, at least all works are public)
      resolve(true)
      return
    } else if (Capability.EditPerformance==capability || Capability.ViewPerformance==capability) {
      // view public?
      // PerformanceManager or owner of work
      if (!performance) {
        //reject(new PermissionError(`performance not specified`))
        resolve(false)
        return
      }
      if (!work) {
        //reject(new PermissionError(`performance work not specified`))
        resolve(false)
        return
      }
      if (Capability.ViewPerformance==capability && performance.ispublic) {
        // anyone can view a public performance
        resolve(true)
        return
      }
      getRoles(account, work.id, null)
      .then((roles) => {
        if (roles.indexOf(Role.Owner)>=0) {
          resolve(true)
          return
        }
        getRoles(account, work.id, performance.id)
        .then((roles) => {
          if (roles.indexOf(Role.PerformanceManager)>=0) {
            resolve(true)
            return
          } else {
            //reject(new PermissionError(`${account.email} does not have Edit rights on ${work.title} ${performance.title}`))
            resolve(false)
            return
          }
        })
      .catch((err) => { reject(err) })
      })
      .catch((err) => { reject(err) })
    } else if (Capability.ManagePerformanceIntegration==capability || Capability.CreateRecording==capability || Capability.EditRecording==capability || Capability.ViewRecording==capability) {
      // performance manager
      if (!performance) {
        //reject(new PermissionError(`performance not specified`))
        resolve(false)
        return
      }
      if (!work) {
        //reject(new PermissionError(`performance work not specified`))
        resolve(false)
        return
      }
      if (Capability.EditRecording==capability || Capability.ViewRecording==capability) {
        if (!recording) {
          //reject(new PermissionError(`recording not specified`))
          resolve(false)
          return
        }
      }
      if (Capability.ViewRecording==capability && recording.ispublic) {
        // anyone can view a public recording
        resolve(true)
        return
      }
      getRoles(account, work.id, performance.id)
      .then((roles) => {
        if (roles.indexOf(Role.PerformanceManager)>=0) {
          resolve(true)
          return
        } else {
          //reject(new PermissionError(`${account.email} does not have performance management rights on ${work.title} ${performance.title}`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    }
    else {
      console.log(`Error: unchecked capability ${capability}`)
      //reject(new PermissionError(`unknown capability ${capability}`))
      resolve(false)
    }
  })
}
