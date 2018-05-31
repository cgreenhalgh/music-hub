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
  DownloadWork = 'download-work',
  EditRolesWork = 'edit-roles-work',
  CreateWorkPerformance = 'create-work-performance',
  // Capabilities in relation to a performance:
  EditPerformance = 'edit-performance',
  ViewPerformance = 'view-performance',
  EditRolesPerformance = 'edit-roles-performance',
  CreateRecording = 'create-recording',
  ManagePerformanceIntegration = 'manage-performance-integration',
  CreatePerformanceIntegration = 'create-performance-integration',
  // Capabilities in relation to a recording:
  EditRecording = 'edit-recording',
  ViewRecording = 'view-recording'
}

export type Capabilities = { 
  [key: string]: boolean
}

export interface Account {
  id:number
  email:string
  // passwordhash:string
  nickname:string
  description:string
  roles?:RoleAssignment[]
}

export interface Download {
  filename:string
}

export interface Work {
  id:number
  title:string
  year:string
  version?:string
  composer?:string
  description?:string
  capabilities?:Capabilities
}

export interface Performance {
  id:number
  workid:number
  work?:Work
  title:string
  description?:string
  performer_title:string
  performer_bio?:string
  location:string
  venue_title:string
  date?:string //DATE,
  time?:string //TIME,
  timezone?:string // VARCHAR(20),
  ispublic:boolean
  status:string
  linked_performanceid:number
  linked_performance?:Performance
  rev_linked_performance?:Performance
  recordings?:Recording[]
  capabilities?:Capabilities
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
  id:number
  workid:number
  performanceid:number
  relpath:string
  mimetype:string
  perspective?:string
  start_time_offset:number
  ispublic:boolean
}

export interface PluginSetting {
  name:string
  value:string
}

export interface PluginAction {
  id:string
  title:string
  description:string
  confirm:boolean
}

export interface PluginDownload {
  data:any
  mimeType:string
  filename:string
}

export interface PluginActionResponse {
  message:string
  error?:Error
  data?:any
  download?:PluginDownload
}

export interface Plugin {
  id:number
  title:string
  code:string
  settings?:PluginSetting[]
  actions?:PluginAction[]
}

export interface PerformanceIntegration {
  id:number
  performanceid:number
  performance?:Performance
  pluginid:number
  plugin?:Plugin
  enabled:boolean
  guid?:string
  settings?:PluginSetting[]
  capabilities?:Capabilities
}

