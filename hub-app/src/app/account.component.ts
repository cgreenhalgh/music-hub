import { Component, OnInit } from '@angular/core';

import { ApiService, Login, LoginState } from './api.service'
import { Account } from './types'

@Component({
  selector: 'account',
  templateUrl: './account.component.html'
})
export class AccountComponent implements OnInit {
  account:Account
  email:string
  password:string
  loginSubscription:any
  login:Login 

  constructor(private api:ApiService) {}
    
  ngOnInit(): void {
    this.loginSubscription = this.api.watchLogin().subscribe((l) => {
      console.log(`login: ${l}`)
      this.login = l
    })
  }

  ngOnDestroy() {
    this.loginSubscription.unsubscribe();
  }

  onSubmit() { 
    console.log(`email: ${this.email}, password: ${this.password}`)
    this.api.login(this.email, this.password)
  }
  onLogout() {
    this.api.logout()
  }
}
