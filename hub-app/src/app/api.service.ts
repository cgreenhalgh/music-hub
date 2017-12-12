import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
//import { Headers, HttpClient } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';

import { Account } from './types'

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
  apiUrl:string = 'http://localhost:8000/api/1'

  constructor(private http: HttpClient) { }

  watchLogin():BehaviorSubject<Login> { return this.loginSubject; }

  login(username:string, password:string) {
    let nl:Login = { 
      username: username,
      password: password,
      state: LoginState.LoggingIn
    }
    this.loginSubject.next(nl)
    let auth="Basic "+ btoa(username + ":" + password);
    let headers = new HttpHeaders({'Authorization': auth})
    this.http.get<Account>(this.apiUrl+'/account', {headers:headers})
    .subscribe(
       (res) => {
         console.log(`login -> ${res}`)
         let nl:Login = { 
           username: username,
           password: '',
           state: LoginState.LoggedIn,
           account: res as Account
         }
         this.loginSubject.next(nl)
       },
       (err) => {
         let error = 'Login error'
         if (err.error instanceof Error) {
           // A client-side or network error occurred. Handle it accordingly.
           error = err.error.message
         } else {
           error = `Server returned status ${err.status}`
         }
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
  getAccount() : Observable<Account> {
    console.log(`getAccount from ${this.apiUrl}`)
    return this.http.get<Account>(this.apiUrl+'/account')
  }
}