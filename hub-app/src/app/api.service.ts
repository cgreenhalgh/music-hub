import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
//import { Headers, HttpClient } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { Account, Work, Performance, PerformanceIntegration, PluginActionResponse, Download } from './types'

export enum LoginState {
  LoggedOut = 1,
  LoggingIn,
  LoggedIn
}
export interface Login {
  username:string
  password:string
  account?:Account
  state: LoginState
  error?:string
}

//import 'rxjs/add/operator/toPromise';

@Injectable()
export class ApiService {
  loginSubject:BehaviorSubject<Login> = new BehaviorSubject<Login>({username:'',password:'',state:LoginState.LoggedOut})
  apiUrl:string = 'api/1'

  constructor(private http: HttpClient) { }

  watchLogin():BehaviorSubject<Login> { return this.loginSubject; }

  getHeaders(): HttpHeaders {
    let l = this.loginSubject.getValue()
    if (l.username && l.password) {
      let auth="Basic "+ btoa(l.username + ":" + l.password);
      console.log(`api call with ${l.username} ${l.password}`)
      return new HttpHeaders({'Authorization': auth})
     } else {
      console.log(`Warning: api call without username/password`)
      return new HttpHeaders({})
    } 
  }

  login(username:string, password:string) {
    let nl:Login = { 
      username: username,
      password: password,
      state: LoginState.LoggingIn
    }
    this.loginSubject.next(nl)
    this.http.get<Account>(this.apiUrl+'/account', {headers:this.getHeaders()})
    .subscribe(
       (res) => {
         console.log(`login -> ${res}`)
         let nl:Login = { 
           username: username,
           password: password,
           state: LoginState.LoggedIn,
           account: res as Account
         }
         this.loginSubject.next(nl)
       },
       (err) => {
         let error = this.getMessageForError(err)
         console.log(`login error ${error}`)
         let nl:Login = { 
           username: username,
           password: '',
           state: LoginState.LoggedOut,
           error: error
         }
         this.loginSubject.next(nl)
       }
    )
  }
  logout() {
    console.log(`logout`)
    let nl:Login = { 
      username: this.loginSubject.getValue().username,
      password: '',
      state: LoginState.LoggedOut,
    }
    this.loginSubject.next(nl)
  }
  getWorks(): Observable<Work[]> {
    return this.http.get<Work[]>(this.apiUrl+'/works', {headers:this.getHeaders()})
  }
  getWork(workid:string): Observable<Work> {
    return this.http.get<Work>(this.apiUrl+'/work/'+encodeURIComponent(workid), {headers:this.getHeaders()})
  }
  getPerformancesOfWork(workid:string): Observable<Performance[]> {
    return this.http.get<Performance[]>(this.apiUrl+'/work/'+encodeURIComponent(workid)+'/performances', {headers:this.getHeaders()})
  }
  getDownloadsForWork(workid:string): Observable<Download[]> {
    return this.http.get<Download[]>(this.apiUrl+'/work/'+encodeURIComponent(workid)+'/downloads', {headers:this.getHeaders()})
  }
  getPerformance(performanceid:string): Observable<Performance> {
    return this.http.get<Performance>(this.apiUrl+'/performance/'+encodeURIComponent(performanceid), {headers:this.getHeaders()})
  }
  getPerformanceIntegrations(performanceid:string): Observable<PerformanceIntegration[]> {
    return this.http.get<PerformanceIntegration[]>(this.apiUrl+'/performance/'+encodeURIComponent(performanceid)+'/integrations', {headers:this.getHeaders()})
  }
  getPerformanceIntegration(performanceid:string, pluginid:string): Observable<PerformanceIntegration> {
    return this.http.get<PerformanceIntegration>(this.apiUrl+'/performance/'+encodeURIComponent(performanceid)+'/integration/'+encodeURIComponent(pluginid), {headers:this.getHeaders()})
  }
  doIntegrationAction(performanceid:string, pluginid:string, actionid:string): Observable<PluginActionResponse> {
    return this.http.post<PluginActionResponse>(this.apiUrl+'/performance/'+encodeURIComponent(performanceid)+'/integration/'+encodeURIComponent(pluginid)+'/'+encodeURIComponent(actionid), null, {headers:this.getHeaders()})
  }
  putPerformance(performance:Performance): Observable<Performance> {
    // selective... no cached values
    let p:Performance = Object.assign({}, performance)
    delete p.linked_performance
    delete p.work
    return this.http.put<Performance>(this.apiUrl+'/performance/'+encodeURIComponent(String(performance.id)), p, {headers: this.getHeaders()})
  }
  postPerformanceOfWork(performance:Performance, workid: string): Observable<Performance> {
    // selective... no cached values
    let p:Performance = Object.assign({}, performance)
    delete p.linked_performance
    delete p.work
    delete p.capabilities
    return this.http.post<Performance>(this.apiUrl+'/work/'+encodeURIComponent(workid)+'/performances', p, {headers: this.getHeaders()})
  }
  getMessageForError(err):string {
    let error = 'Error making request to server'
    if (err.error instanceof Error) {
      // A client-side or network error occurred. Handle it accordingly.
      error = err.error.message
    } else if (!!err.error) {
      error = String(err.error)
    } else if (err.message) {
      error = err.message
    } else {
      error = `Server returned status ${err.status}`
    }
    return error
  }
  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.apiUrl+'/accounts', {headers:this.getHeaders()})
  }
  hasCapability(capability:string): Observable<boolean> {
    return this.http.get<boolean>(this.apiUrl+'/capability/'+encodeURIComponent(capability), {headers:this.getHeaders()})
  }
}