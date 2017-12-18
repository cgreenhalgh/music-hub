// climbapp plugin
import { PluginProvider, registerPlugin } from './plugins'
import { PerformanceIntegration, PluginAction, PluginActionResponse } from './types'

const REDIS_LIST = "redis-list"
const REDIS_CLEAR = "redis-clear"
const APP_CONFIG = "app-config"

const actions:PluginAction [] = [
  {
    "id":REDIS_LIST,
    "title":"Show state",
    "description":"Show live app state",
    "confirm":false
  },
  {
    "id":REDIS_CLEAR,
    "title":"Reset state",
    "description":"Reset live app state",
    "confirm":true
  },
  {
    "id":APP_CONFIG,
    "title":"Configure",
    "description":"Generate/update app configuration",
    "confirm":true
  }
]


export class ClimbappPlugin extends PluginProvider {
  constructor(perfint:PerformanceIntegration) {
    super(perfint, actions)
    console.log(`Create climbapp integration ${this.perfint.id} for performance ${this.perfint.performanceid}`)
  }
  getCode(): string {
    return 'climbapp'
  }
  enable(): void {
    // TODO
  }
  disable(): void {
    // TODO
  }
  doAction(action:string):PluginActionResponse {
    if (REDIS_LIST==action)
      return this.redisList()
    else if (REDIS_CLEAR==action)
      return this.redisClear()
    else if (APP_CONFIG==action)
      return this.appConfig()
    return super.doAction(action)
  }
  redisList(): PluginActionResponse {
    // TODO
    let resp:PluginActionResponse = { 
      message:"whir whir..."
    }
    return resp    
  }
  redisClear(): PluginActionResponse {
    // TODO
    let resp:PluginActionResponse = { 
      message:"whir whir..."
    }
    return resp
  }
  appConfig(): PluginActionResponse {
    console.log(`configure climbapp ${this.perfint.id} for performance ${this.perfint.performanceid}`)
    // TODO
    let resp:PluginActionResponse = { 
      message:"whir whir..."
    }
    return resp
  }
}

