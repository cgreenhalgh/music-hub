import { Component, OnInit } from '@angular/core';

import { Account, Capability } from './types'
import { ApiService } from './api.service'

@Component({
  selector: 'hub-accounts-list',
  templateUrl: './accounts-list.component.html'
})
export class AccountsListComponent implements OnInit {
  accounts:Account[] = []
  error:string = null
  loading:boolean = true
  isadmin:boolean = false
  adding:boolean = false
  editing:boolean = false
  saving:boolean = false
  account:Account = null
  constructor(private api:ApiService) {}

  getAccounts(): void {
    this.api.getAccounts().subscribe(
      (res) => { this.accounts= res; this.loading=false; },
      (err) => { this.error = err.message; this.loading=false }
    )  
  }
  ngOnInit(): void {
    this.getAccounts()
    this.api.hasCapability(Capability.CreateAccount).subscribe(
      (res) => { this.isadmin= res; },
      (err) => { console.log('error checking CreateAccount capability', err) }
    )
  }
  addAccount(): void {
    // TODO
    console.log('add account...')
    this.adding = true
    this.editing = false
    this.account = {} as Account
  }
  save(account:Account) {
    console.log('save account', account)
    this.saving = true
    this.error = null
    this.api.postAccount(account).subscribe(
      (res) => {
        console.log('added account as '+res)
        this.saving = false; this.adding = false; this.getAccounts()
      },
      (err) => { this.saving = false; this.error = this.api.getMessageForError(err) }
    )
  }
  cancel() {
    this.adding = this.editing = false
    this.error = null
  }
}
