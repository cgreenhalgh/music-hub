// climbapp plugin
import * as redis from 'redis'
import * as fs from 'fs'

import { PluginProvider, registerPlugin, getPluginDir, getMountDir } from './plugins'
import { PerformanceIntegration, PluginAction, PluginActionResponse } from './types'
import { getRawPerformanceIntegration, getRawPerformance, getRawPluginSetting } from './db'

const PLUGIN_CODE = 'climbapp'
const REDIS_LIST = "redis-list"
const REDIS_CLEAR = "redis-clear"
const APP_CONFIG = "app-config"
const GET_URL = "get-url"
const APPURL_SETTING = 'appurl'

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
  },
  {
    "id":GET_URL,
    "title":"Get URL",
    "description":"Get external app URL",
    "confirm":false
  }
]

interface MuzivisualPerformance {
  title:string
  location:string
  performer:string
  guid:string
}
interface MuzivisualConfig {
  // TODO refine types?!
  pastPerformances?:any[]
  map?:any[]
  narrative?:any[]
  performances?:MuzivisualPerformance[]
  performers?:string[]
}

export class ClimbappPlugin extends PluginProvider {
  private redisClient
  
  constructor(perfint:PerformanceIntegration) {
    super(perfint, actions)
    console.log(`Create climbapp integration ${this.perfint.id} for performance ${this.perfint.performanceid}`)
  }
  private init() {
    if (this.redisClient)
      return
    var redis_host = process.env.REDIS_HOST || 'store';
    var redis_config:any = { host: redis_host, port: 6379 };
    if (process.env.REDIS_PASSWORD) {
      redis_config.auth_pass = process.env.REDIS_PASSWORD;
    }
    console.log('using redis config ' + JSON.stringify(redis_config));

    this.redisClient = redis.createClient(redis_config);
    this.redisClient.on("error", function (err) {
      console.log("Redis error " + err);
    }); 
  }
  getCode(): string {
    return PLUGIN_CODE
  }
  enable(): void {
    // TODO
  }
  disable(): void {
    // TODO
  }
  doAction(action:string):Promise<PluginActionResponse> {
    return new Promise((resolve, reject) => {
      if (REDIS_LIST==action)
        this.redisList(resolve, reject)
      else if (REDIS_CLEAR==action)
        this.redisClear(resolve, reject)
      else if (APP_CONFIG==action)
        this.appConfig(resolve, reject)
      else if (GET_URL==action)
        this.getUrl(resolve, reject)
      else
        resolve({message:'Unknown action on climbapp', error: new Error('Unknown action')})
    })
  }
  redisList(resolve, reject):void {
    this.init()
    getRawPerformanceIntegration(this.perfint.id)
    .then((perfint) => {
      if (!perfint.guid) {
        resolve({message:'GUID not set on climbapp integration', error: new Error('GUID not set')})
        return
      }
      let key = 'performance:'+perfint.guid
      this.redisClient.lrange(key, 0, -1, function (err, msgs) {
        if (err) {
          console.log('error getting saved messages for performance ' + perfint.guid, err);
          resolve({message:'Error getting state from redis', error: err});
          return
        }
        resolve({message:`Current state: ${msgs}`})
      });
    })
    .catch((err) => resolve({message:'Error getting integration state', error: err}))
  }
  redisClear(resolve, reject):void {
    this.init()
    getRawPerformanceIntegration(this.perfint.id)
    .then((perfint) => {
      if (!perfint.guid) {
        resolve({message:'GUID not set on climbapp integration', error: new Error('GUID not set')})
        return
      }
      let key = 'performance:'+perfint.guid
      this.redisClient.del(key, function (err, msgs) {
        if (err) {
          console.log('error clearing saved messages for performance ' + perfint.guid, err);
          resolve({message:'Error clearing state in redis', error: err});
          return
        }
        resolve({message:`Cleared saved app state in redis`})
      });
    })
    .catch((err) => resolve({message:'Error getting integration state', error: err}))
  }
  appConfig(resolve, reject):void {
    console.log(`configure climbapp ${this.perfint.id} for performance ${this.perfint.performanceid}`)
    getRawPerformanceIntegration(this.perfint.id)
    .then((perfint) => {
      if (!perfint.guid) {
        resolve({message:'GUID not set on climbapp integration', error: new Error('GUID not set')})
        return
      }
      getRawPerformance(this.perfint.performanceid)
      .then((perf) => {
        // TODO linked performance
        let mperf : MuzivisualPerformance = {
          title: perf.title,
          location: perf.location,
          performer: perf.performer_title,
          guid:perfint.guid
        }
        let templatefile = getPluginDir(PLUGIN_CODE) + '/muzivisual-config.json'
        fs.readFile(templatefile, 'utf8', (err, data) => {
          if(err) {
            resolve({message:`Error reading template file ${templatefile}`, error: err})
            return
          }
          var mconfig:MuzivisualConfig = null
          try {
            mconfig = JSON.parse(data) as MuzivisualConfig
          }
          catch(err) {
            resolve({message:`Error parsing template file ${templatefile}`, error: err})
            return
          }
          if (!mconfig.performances)
            mconfig.performances = []
          mconfig.performances.push(mperf)
          if (!mconfig.performers) 
            mconfig.performers = []
          mconfig.performers.push(perf.performer_bio)
          // write output
          let outputfile = getMountDir(PLUGIN_CODE, 'muzivisual2')+'/'+perfint.guid+'.json'
          console.log(`write climbapp config to ${outputfile}`)
          fs.writeFile(outputfile, JSON.stringify(mconfig), 'utf8', (err) => {
            if(err) {
              resolve({message:`Error writing app config file ${outputfile}`, error: err})
              return
            }
            let resp:PluginActionResponse = { 
              message:`Wrote app config file ${outputfile}`
            }
            resolve(resp)
          })
        })
      })
      .catch((err) => reject(err))
    })
    .catch((err) => reject(err))
  }
  getUrl(resolve, reject):void {
    console.log(`get url climbapp ${this.perfint.id} for performance ${this.perfint.performanceid}`)
    getRawPerformanceIntegration(this.perfint.id)
    .then((perfint) => {
      if (!perfint.guid) {
        resolve({message:'GUID not set on climbapp integration', error: new Error('GUID not set')})
        return
      }
      getRawPluginSetting(this.perfint.pluginid, APPURL_SETTING)
      .then((appurl) => {
        if (!appurl) {
          resolve({message:'Appurl not set on climbapp plugin', error: new Error('GUID not set')})
          return
        }
        let url = appurl+'?p='+encodeURIComponent(perfint.guid)
        resolve({message:url})
      })
      .catch((err) => reject(err))
    })
    .catch((err) => reject(err))
  }
}
