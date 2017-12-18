// climbapp plugin
import * as redis from 'redis'

import { PluginProvider, registerPlugin } from './plugins'
import { PerformanceIntegration, PluginAction, PluginActionResponse } from './types'
import { getRawPerformanceIntegration } from './db'

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
    return 'climbapp'
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
    // TODO
    let resp:PluginActionResponse = { 
      message:"whir whir..."
    }
    resolve(resp)
  }
}

