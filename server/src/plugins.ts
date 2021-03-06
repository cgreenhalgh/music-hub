import { PerformanceIntegration, PluginAction, PluginActionResponse } from './types'

export function getPluginDir(code:string):string {
  return __dirname+'/../../plugins/'+code
}
export function getMountDir(code:string, mount:string):string {
  return __dirname+'/../../mounts/'+code+'/'+mount
}

export class PluginProvider {
  // is it ok to hold on to the old value?!
  constructor(protected perfint:PerformanceIntegration, protected actions:PluginAction[]) {}
  getCode():string { return null }
  enable():void {}
  disable():void {}
  getActions():PluginAction[] { return this.actions; }
  doAction(action:string):Promise<PluginActionResponse> {
    return new Promise((resolve, reject) => {
      let resp:PluginActionResponse = { 
        message:"No implemented",
        error:new Error('Action not implemented')
      }
      resolve(resp)
    })
  }
}

interface PluginProviderMap {
  [propName:string]:(PerformanceIntegration)=>PluginProvider
}

let pluginProviders:PluginProviderMap = {}

interface PluginMap {
  [propName:string]:PluginProvider
}

let plugins:PluginMap = {}


export function registerPlugin(code:string, provider:(PerformanceIntegration)=>PluginProvider): void {
  console.log(`register plugin ${code}`)
  pluginProviders[code] = provider
}

export function getPlugin(perfint:PerformanceIntegration):PluginProvider {
  let id = String(perfint.id)
  let plugin = plugins[id]
  if (plugin)
    return plugin
  let code = perfint.plugin.code
  let provider = (pluginProviders[code])
  if (!provider) {
    console.log(`Unknown plugin provider: ${perfint.plugin.code}`)
    return null
  }
  plugin = (provider)(perfint)
  plugins[id] = plugin
  return plugin
}