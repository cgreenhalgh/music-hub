// climbapp plugin
import * as redis from 'redis'
import * as fs from 'fs'

import { PluginProvider, registerPlugin, getPluginDir, getMountDir } from './plugins'
import { PerformanceIntegration, Performance, PluginAction, PluginActionResponse } from './types'
import { getRawPerformanceIntegration, getRawPerformance, getRawPluginSetting, getRawRevLinkedPerformanceId, getRawPerformanceIntegration2, 
    getRawPerformanceIntegrationSetting, setRawPerformanceIntegrationSetting, getRawPerformanceIntegrationsForSetting } from './db'

const PLUGIN_CODE = 'climbapp'
const REDIS_LIST = "redis-list"
const REDIS_CLEAR = "redis-clear"
const APP_CONFIG = "app-config"
const GET_URL = "get-url"
const GET_MPM_CONFIG = "get-mpm-config"
const GET_MUZICODES_SETTINGS = "get-muzicodes-settings"
const ARCHIVE_INCLUDE = "archive-include"
const ARCHIVE_EXCLUDE = "archive-exclude"
const ARCHIVE_RESET_LOG = 'archive-reset-log'
const APPURL_SETTING = 'appurl'
const LOGPROCAPIURL_SETTING = 'logprocapiurl'
const REDISHOST_SETTING = 'redishost'
const MOUNT_ARCHIVE = 'archive'
const SETTING_ARCHIVE = 'archive'
const ARCHIVE_URLS_PREFIX = 'assets/data/'
const ARCHIVE_LOG_PREFIX = 'log-'
const ARCHIVE_PERFORMANCES_FILE = 'musichub-performances.json'

const actions:PluginAction [] = [
  {
    "id":REDIS_LIST,
    "title":"Show app state",
    "description":"Show live app state",
    "confirm":false
  },
  {
    "id":REDIS_CLEAR,
    "title":"Reset app state",
    "description":"Reset live app state",
    "confirm":true
  },
  {
    "id":APP_CONFIG,
    "title":"Configure app",
    "description":"Generate/update app configuration",
    "confirm":true
  },
  {
    "id":GET_URL,
    "title":"Get app URL",
    "description":"Get external app URL",
    "confirm":false
  },
  {
    "id":GET_MPM_CONFIG,
    "title":"Get MPM file",
    "description":"Get music-performance-manager config file",
    "confirm":false
  },
  {
    "id":GET_MUZICODES_SETTINGS,
    "title":"Get Muzicodes settings",
    "description":"Get muzicodes app link (global) settings",
    "confirm":false
  },
  {
    "id":ARCHIVE_INCLUDE,
    "title":"Add to archive",
    "description":"Generate/update archive configuration to include this performance",
    "confirm":true
  },
  {
    "id":ARCHIVE_EXCLUDE,
    "title":"Not in archive",
    "description":"Generate/update archive configuration to EXCLUDE this performance",
    "confirm":true
  },
  {
    "id":ARCHIVE_RESET_LOG,
    "title":"Reset archive",
    "description":"Reset archive state to unperformed",
    "confirm":true
  }
]

interface MuzivisualPerformance {
  title:string
  location:string
  performer:string
  guid:string
  time?:number
}
interface MuzivisualConfig {
  // TODO refine types?!
  pastPerformances?:any[]
  map?:any[]
  narrative?:any[]
  performances?:MuzivisualPerformance[]
  performers?:string[]
}

interface MpmExpect {
  id:string
  name:string
  kind:string
  level:string
  testPoint?:string
  requires?:string[]
  like?:string
  button?:string
}
interface MpmConfig {
  expect:MpmExpect[]
}
const mpmExpectPerformance:MpmExpect = {
  "id": "musicodes.performanceid.{{guid}}",
  "name": "= {{performance.title}}",
  "kind": "TestPoint",
  "level": "warning",
  "testPoint": "performanceid",
  "requires": ["musicodes.player"],
  "like": "{{guid}}",
  "button": "{{guid}}"
}


function replaceVariables(data:any, variables:any, name?:string) {
    if (!name)
        name = '';
    if (Array.isArray(data) || typeof(data)=='object') {
        for (var key in data) {
            var value = data[key];
            if (typeof(value)=='string') {
                for (var name in variables) {
                    if (value=='{{'+name+'}}') {
                        value =  variables[name];
                        break;
                    }
                    value = value.replace('{{'+name+'}}', variables[name]);
                }
                if (data[key]!=value) {
                    //console.log('replace '+data[key]+' -> '+value);
                }
                data[key] = value;
            } else {
                replaceVariables(value, variables, name+'.'+key);
            }
        }
    } else {
        //console.log('ignore '+name+' - '+typeof(data));
    }
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
      else if (GET_MPM_CONFIG==action)
        this.getMpmConfig(resolve, reject)
      else if (GET_MUZICODES_SETTINGS==action)
        this.getMuzicodesSettings(resolve, reject)
      else if (ARCHIVE_INCLUDE==action)
        this.archiveUpdate(true, resolve, reject)
      else if (ARCHIVE_EXCLUDE==action)
        this.archiveUpdate(false, resolve, reject)
      else if (ARCHIVE_RESET_LOG==action)
        this.archiveResetLog(resolve, reject)
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
    let debug = false
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
            
          // linked performances
          // rev linked performance
          getRawRevLinkedPerformanceId(perf)
            .then((lpid) => {
              if (debug) console.log(`rev linked performance ${lpid} ...`)
              if (lpid!==null) {
                if (debug) console.log(`intergration ${this.perfint.id} performance ${perf.id} has reverse link ${lpid}`)
                return getRawPerformance(lpid)
                  .then((p) => {
                    // add expect
                    if (p) {
                      return getRawPerformanceIntegration2(this.perfint.pluginid, lpid)
                        .then((pi2) => {
                          if (pi2 && pi2.enabled) {
                            let mperf2 : MuzivisualPerformance = {
                              title: p.title,
                              location: p.location,
                              performer: p.performer_title,
                              guid:pi2.guid
                            }
                            // rev linked -> afterwards
                            mconfig.performances.push(mperf2)
                            mconfig.performers.push(p.performer_bio)
                            if (debug) console.log(`  added rev linked perf integration ${pi2.guid}`)
                          }
                          else {
                            console.log(`Warning: rev linked perf integration ${this.perfint.pluginid} / ${lpid} not found / disabled`, pi2)
                          }
                        })
                    }
                  })
              }
            })
            // linked_performance
            .then(() => {
              if (debug) console.log(`linked performance ${perf.linked_performanceid} ...`)
              if (perf.linked_performanceid) {
                if (debug) console.log(`intergration ${this.perfint.id} performance ${perf.id} has link ${perf.linked_performanceid}`)
                return getRawPerformance(perf.linked_performanceid)
                  .then((p) => {
                    // add expect
                    if (p) {
                      return getRawPerformanceIntegration2(this.perfint.pluginid, perf.linked_performanceid)
                        .then(pi2 => {
                          if (pi2 && pi2.enabled) {
                            let mperf2 : MuzivisualPerformance = {
                              title: p.title,
                              location: p.location,
                              performer: p.performer_title,
                              guid:pi2.guid,
                              // TODO a proper time? just make it future for now
                              time:2000000000000
                            }
                            // rev linked -> pastPerformances, reverse
                            mconfig.pastPerformances.push(mperf2)
                            mconfig.performers.splice(0, 0, p.performer_bio)
                            if (debug) console.log(`  added linked perf integration ${pi2.guid}`)
                          }
                          else {
                            console.log(`Warning: linked perf integration ${this.perfint.pluginid} / ${perf.linked_performanceid} not found / disabled`, pi2)
                          }
                        })
                    }
                  })
              }
            })
            .then(() => {
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
           .catch((err) => reject(err))
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
  getMpmConfig(resolve, reject):void {
    let debug = false
    console.log(`get mpm config climbapp ${this.perfint.id} for performance ${this.perfint.performanceid}`)
    getRawPerformanceIntegration(this.perfint.id)
    .then((perfint) => {
      if (!perfint.guid) {
        resolve({message:'GUID not set on climbapp integration', error: new Error('GUID not set')})
        return
      }
      getRawPluginSetting(this.perfint.pluginid, LOGPROCAPIURL_SETTING)
      .then((logprocapiurl) => {
        if (!logprocapiurl) {
          resolve({message:'logprocapiurl not set on climbapp plugin', error: new Error('GUID not set')})
          return
        }
        getRawPerformance(this.perfint.performanceid)
        .then((perf) => {
          if (debug) console.log(`mpm config found performance ${perf.id}`)
          let templatefile = getPluginDir(PLUGIN_CODE) + '/mpm-config.json'
          fs.readFile(templatefile, 'utf8', (err, data) => {
            if(err) {
              resolve({message:`Error reading template file ${templatefile}`, error: err})
              return
            }
            let vars = {
              performance: perf,
              guid: perfint.guid,
              settings: { logprocapiurl: '' },
              ip: '{{ip}}',
              env: { LOGPROC_PASSWORD: process.env.LOGPROC_PASSWORD }
            }
            // template logprocurl!
            vars.settings.logprocapiurl = this.template(logprocapiurl, vars)
            data = this.template(data, vars)
            let json:MpmConfig = JSON.parse(data) as MpmConfig
            // insert performance id(s)
            let ix = 0
            for (ix=0; ix<json.expect.length; ix++) {
              if ('musicodes.performanceid'==json.expect[ix].id) {
                ix++
                break
              }
            }
            let ex = JSON.parse(this.template(JSON.stringify(mpmExpectPerformance), vars))
            json.expect.splice(ix, 0, ex)
            // rev linked performance
            getRawRevLinkedPerformanceId(perf)
            .then((lpid) => {
              if (debug) console.log(`rev linked performance ${lpid} ...`)
              if (lpid!==null) {
                if (debug) console.log(`intergration ${this.perfint.id} performance ${perf.id} has reverse link ${lpid}`)
                return getRawPerformance(lpid)
                  .then((p) => {
                    // add expect
                    if (p) {
                      return getRawPerformanceIntegration2(this.perfint.pluginid, lpid)
                        .then((pi2) => {
                          if (pi2 && pi2.enabled) {
                            vars.performance = p
                            vars.guid = pi2.guid
                            let ex = JSON.parse(this.template(JSON.stringify(mpmExpectPerformance), vars))
                            json.expect.splice(ix+1, 0, ex)
                            if (debug) console.log(`  added rev linked perf integration ${pi2.guid}`)
                          }
                          else {
                            console.log(`Warning: rev linked perf integration ${this.perfint.pluginid} / ${lpid} not found / disabled`, pi2)
                          }
                        })
                    }
                  })
              }
            })
            // linked_performance
            .then(() => {
              if (debug) console.log(`linked performance ${perf.linked_performanceid} ...`)
              if (perf.linked_performanceid) {
                if (debug) console.log(`intergration ${this.perfint.id} performance ${perf.id} has link ${perf.linked_performanceid}`)
                return getRawPerformance(perf.linked_performanceid)
                  .then((p) => {
                    // add expect
                    if (p) {
                      return getRawPerformanceIntegration2(this.perfint.pluginid, perf.linked_performanceid)
                        .then(pi2 => {
                          if (pi2 && pi2.enabled) {
                            vars.performance = p
                            vars.guid = pi2.guid
                            let ex = JSON.parse(this.template(JSON.stringify(mpmExpectPerformance), vars))
                            json.expect.splice(ix, 0, ex)
                            if (debug) console.log(`  added linked perf integration ${pi2.guid}`)
                          }
                          else {
                            console.log(`Warning: linked perf integration ${this.perfint.pluginid} / ${perf.linked_performanceid} not found / disabled`, pi2)
                          }
                        })
                    }
                  })
              }
            })
            .then(() => {
              resolve({message:`MPM config returned`, download: { filename: 'mpm-'+perfint.guid+'.json', mimeType: 'application/json', data: JSON.stringify(json) }})
            })
           .catch((err) => reject(err))
          })
        })
        .catch((err) => reject(err))
      })
      .catch((err) => reject(err))
    })
    .catch((err) => reject(err))
  }
  
  template(data:string, vars:any): string {
    let res = ''
    let ix=0
    while(ix>=0) {
      let nix = data.indexOf('{{', ix)
      if (nix<0) {
        res = res + data.substring(ix)
        break
      }
      res = res + data.substring(ix, nix)
      let eix = data.indexOf('}}', nix+2)
      if (eix<0) {
        res = res + data.substring(ix)
        break
      }
      let names = data.substring(nix+2, eix).trim().split('.')
      let val = vars
      for(let n of names) {
        if (typeof(val)!='object') {
          console.log(`found non-object at ${n} in ${names}`)
          val = ''
          break
        }
        val = val[n]
      }
      if (val===null || val===undefined) 
        val = ''
      // escape??
      res = res+ val
      ix = eix+2
    }
    return res
  }
  getMuzicodesSettings(resolve, reject):void {
    console.log(`get muzicodes settings climbapp ${this.perfint.id} for performance ${this.perfint.performanceid}`)
    getRawPluginSetting(this.perfint.pluginid, REDISHOST_SETTING)
    .then((redishost) => {
      if (!redishost) {
        resolve({message:'redishost not set on climbapp plugin', error: new Error('GUID not set')})
        return
      }
      resolve({message:`Use redis: yes; Redis host: ${redishost}; Redis port: 6379; Redis password: ${process.env.REDIS_PASSWORD}`})
    })
    .catch((err) => reject(err))
  }
  archiveWriteEmptyLog(guid:string, skipIfExists:boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      let templatefile = getPluginDir(PLUGIN_CODE) + '/archive-empty.json'
      fs.readFile(templatefile, 'utf8', (err, data) => {
        if(err) {
          reject(err)
          return
        }
        let outputfile = getMountDir(PLUGIN_CODE, MOUNT_ARCHIVE)+'/'+ARCHIVE_LOG_PREFIX+guid+'.json'
        fs.access(outputfile, (err) => {
          if (skipIfExists && !err) {
            console.log(`archive log file already exists: ${outputfile}`)
            resolve()
          } else {
            let flag = skipIfExists ? 'wx' : 'w'
            console.log(`write archive empty log file to ${outputfile}`)
            fs.writeFile(outputfile, data, {encoding:'utf8', flag:flag}, (err) => {
              if(err) {
                reject(err)
                return
              }
              resolve()
            })
          }
        })
      })
    })
  }
  archiveUpdate(include:boolean, resolve, reject):void {
    this.init()
    getRawPerformanceIntegration(this.perfint.id)
    .then((perfint) => {
      if (!perfint.guid) {
        resolve({message:'GUID not set on climbapp integration', error: new Error('GUID not set')})
        return
      }
      return setRawPerformanceIntegrationSetting(perfint.id, perfint.pluginid, perfint.performanceid, SETTING_ARCHIVE, include ? '1' : '0')
        .then(() => {
          return getRawPerformanceIntegrationsForSetting(perfint.pluginid, SETTING_ARCHIVE, '1')
          .then((perfints) => { 
            console.log(`found ${perfints.length} perfints for climb archive`)
            let performanceps:Promise<Performance>[] = perfints.map((pi) => getRawPerformance(pi.performanceid))
            return Promise.all(performanceps)
            .then(performances => {
              // log files?!
              let logps:Promise<void>[] = perfints.map((perfint) => this.archiveWriteEmptyLog(perfint.guid, true))
              return Promise.all(logps)
              .then(() => {
                // update performances file
                let templatefile = getPluginDir(PLUGIN_CODE) + '/archive-empty.json'
                fs.readFile(templatefile, 'utf8', (err, templatedata) => {
                  if(err) {
                    reject(err)
                    return
                  }
                  let template = JSON.parse(templatedata)
                  let perftfile = getPluginDir(PLUGIN_CODE) + '/archive-performance.json'
                  fs.readFile(perftfile, 'utf8', (err, perftdata) => {
                    if(err) {
                      reject(err)
                      return
                    }
                    let perstfile = getPluginDir(PLUGIN_CODE) + '/archive-person.json'
                    fs.readFile(perstfile, 'utf8', (err, perstdata) => {
                      if(err) {
                        reject(err)
                        return
                      }
                      template['annal:entity_list'] = []
                      // TODO performances & performers...
                      for (let i=0; i<perfints.length; i++) {
                        let perfint = perfints[i]
                        let performance = performances[i]
                        let vars = {
                          performanceid: perfint.guid,
                          performancetitle: performance.title,
                          systemid: perfint.guid,
                          datetime: performance.date+'T'+performance.time+(performance.timezone ? performance.timezone : 'Z'),
                          description: performance.description,
                          performerid: perfint.guid+'-performer-1',
                          personid: perfint.guid+'-performer-1',
                          persontitle: performance.performer_title,
                          bio: performance.performer_bio
                        }
                        let performanceout = JSON.parse(perftdata)
                        let performerout = JSON.parse(perstdata)
                        replaceVariables(performanceout, vars)
                        replaceVariables(performerout, vars)
                        template['annal:entity_list'].push(performanceout)
                        template['annal:entity_list'].push(performerout)
                      }
                      let perfsofile = getMountDir(PLUGIN_CODE, MOUNT_ARCHIVE)+'/'+ARCHIVE_PERFORMANCES_FILE
                      console.log(`write performances file to ${perfsofile}`)
                      let perfso = JSON.stringify(template, null, 2)
                      fs.writeFile(perfsofile, perfso, 'utf8', (err) => {
                        if(err) {
                          reject(err)
                          return
                        }
                        // URLs file
                        let urlstfile = getPluginDir(PLUGIN_CODE) + '/archive-urls.json'
                        fs.readFile(urlstfile, 'utf8', (err, urlsdata) => {
                          if(err) {
                            reject(err)
                            return
                          }
                          let urls = JSON.parse(urlsdata)
                          urls.push(ARCHIVE_URLS_PREFIX+ARCHIVE_PERFORMANCES_FILE)
                          for (let perfint of perfints) {
                            urls.push(ARCHIVE_URLS_PREFIX+ARCHIVE_LOG_PREFIX+perfint.guid+'.json')
                          }
                          let urlsofile = getMountDir(PLUGIN_CODE, MOUNT_ARCHIVE)+'/urls.json'
                          console.log(`write urls file to ${urlsofile}`)
                          let urlso = JSON.stringify(urls, null, 2)
                          fs.writeFile(urlsofile, urlso, 'utf8', (err) => {
                            if(err) {
                              reject(err)
                              return
                            }
                            if (include) {
                              resolve({message:`Included in archive`})
                            } else {
                              resolve({message:`Excluded from archive`})
                            }
                          })
                        })
                      })
                    })
                  })
                })
              })
            })
          })
        })
    })
    .catch((err) => { console.log(err); resolve({message:'Error getting integration state', error: err}) })
  }
  archiveResetLog(resolve, reject):void {
    this.init()
    getRawPerformanceIntegration(this.perfint.id)
    .then((perfint) => {
      if (!perfint.guid) {
        resolve({message:'GUID not set on climbapp integration', error: new Error('GUID not set')})
        return
      }
      //let key = 'performance:'+perfint.guid
      return this.archiveWriteEmptyLog(perfint.guid, false)
        .then(() =>
          resolve({message:`Cleared log for performance ${perfint.guid}`})
        )
    })
    .catch((err) => resolve({message:'Error getting integration state', error: err}))
  }
}
