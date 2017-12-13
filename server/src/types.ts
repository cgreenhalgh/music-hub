export interface Account {
  id:number
  email:string
  // passwordhash:string
  nickname:string
  description:string
  roles?:RoleAssignment[]
}

export interface Work {
  id:number
  title:string
  year:string
  version?:string
  composer?:string
  description?:string
}

export interface Performance {
  id:number
  workid:number
  work?:Work
  title:string
  description?:string
  performer_title:string
  performer_bio?:string
  venue_title:string
  date?:string //DATE,
  time?:string //TIME,
  timezone?:string // VARCHAR(20),
  ispublic:boolean
  status:string
  linked_performanceid:number
  linked_performance?:Performance
}

export enum Role {
  Admin = 'admin', // site admin, can create and manage accounts
  Publisher = 'publisher', //  can create new works on the site
  Owner = 'owner', // control of work
  PerformanceManager = 'performancemanager', // control of a performance
  Performer = 'performer', // can access supporting resources, e.g. for rehearsal
  Public = 'public' // anyone (default role)
}

export interface RoleAssignment {
  id:number
  accountid:number
  role:Role
  workid?:number
  performanceid?:number
}

export interface Recording {
// TODO finish recording
  ispublic:boolean
}

export interface PluginSetting {
  name:string
  value:string
}

export interface Plugin {
  id:number
  title:string
  code:string
  settings?:PluginSetting[]
}

export interface PerformanceIntegration {
  id:number
  performanceid:number
  performance?:Performance
  pluginid:number
  plugin?:Plugin
  enabled:boolean
  guid?:string
}
