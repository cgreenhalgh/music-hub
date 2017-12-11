import { Account, Work, Performance, Role, Recording } from './types'
import { getRoles } from './db'

// access control
export class AccessError extends Error {
  constructor(m: string) {
    super(m);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AccessError.prototype);
  }
}


export enum Capability {
  //System capabilities:
  CreateAccount = 'create-account',
  EditAccount = 'edit-account',
  ManageAccount = 'manage-account', // e.g. block
  ViewAccount = 'view-account',
  // Capabilities in relation to a work:
  CreateWork = 'create-work',
  EditWork = 'edit-work',
  ViewWork = 'view-work',
  EditRolesWork = 'edit-roles-work',
  CreateWorkPerformance = 'create-work-performance',
  // Capabilities in relation to a performance:
  EditPerformance = 'edit-performance',
  ViewPerformance = 'view-performance',
  EditRolesPerformance = 'edit-roles-performance',
  DownloadPerformance = 'download-performance',
  CreateRecording = 'create-recording',
  // Capabilities in relation to a recording:
  EditRecording = 'edit-recording',
  ViewRecording = 'view-recording'
}

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
          //reject(new AccessError(`${account.email} does not have Admin rights`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    }
    else if (Capability.EditAccount==capability) {
      // admin or account
      if (!onaccount) {
        //reject(new AccessError(`Edit account not specified`))
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
          //reject(new AccessError(`${account.email} does not have Admin rights`))
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
          //reject(new AccessError(`${account.email} does not have Admin or publisher rights`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    } else if (Capability.EditWork==capability || Capability.EditRolesWork==capability || Capability.CreateWorkPerformance==capability || Capability.EditRolesPerformance==capability) {
      // owner?
      if (!work) {
        //reject(new AccessError(`Edit work not specified`))
        resolve(false)
        return
      }
      getRoles(account, work.id, null)
      .then((roles) => {
        if (roles.indexOf(Role.Owner)>=0) {
          resolve(true)
          return
        } else {
          //reject(new AccessError(`${account.email} does not have Owner rights on ${work.title}`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    } else if (Capability.ViewWork==capability) {
      // (owner, performer or) public (all public!)
      resolve(true)
      return
    } else if (Capability.EditPerformance==capability || Capability.ViewPerformance==capability) {
      // view public?
      // PerformanceManager or owner of work
      if (!performance) {
        //reject(new AccessError(`performance not specified`))
        resolve(false)
        return
      }
      if (!work) {
        //reject(new AccessError(`performance work not specified`))
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
        return getRoles(account, work.id, performance.id)
      })
      .then((roles) => {
        if (roles.indexOf(Role.PerformanceManager)>=0) {
          resolve(true)
          return
        } else {
          //reject(new AccessError(`${account.email} does not have Edit rights on ${work.title} ${performance.title}`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    } else if (Capability.DownloadPerformance==capability || Capability.CreateRecording==capability || Capability.EditRecording==capability || Capability.ViewRecording==capability) {
      // performance manager
      if (!performance) {
        //reject(new AccessError(`performance not specified`))
        resolve(false)
        return
      }
      if (!work) {
        //reject(new AccessError(`performance work not specified`))
        resolve(false)
        return
      }
      if (Capability.EditRecording==capability || Capability.ViewRecording==capability) {
        if (!recording) {
          //reject(new AccessError(`recording not specified`))
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
          //reject(new AccessError(`${account.email} does not have performance management rights on ${work.title} ${performance.title}`))
          resolve(false)
          return
        }
      })
      .catch((err) => { reject(err) })
    }
    else {
      console.log(`Error: unchecked capability ${capability}`)
      //reject(new AccessError(`unknown capability ${capability}`))
      resolve(false)
    }
  })
}
