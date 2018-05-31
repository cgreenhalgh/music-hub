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
  constructor(private api:ApiService) {}
    
  ngOnInit(): void {
    this.api.getAccounts().subscribe(
      (res) => { this.accounts= res; this.loading=false; },
      (err) => { this.error = err.message; this.loading=false }
    )  
    this.api.hasCapability(Capability.CreateAccount).subscribe(
      (res) => { this.isadmin= res; },
      (err) => { console.log('error checking CreateAccount capability', err) }
    )
  }
  addAccount(): void {
    // TODO
    console.log('add account...')
  }
}
