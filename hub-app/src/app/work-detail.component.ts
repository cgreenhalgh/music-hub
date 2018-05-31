import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { Work, Performance, Download, RoleAssignment, Capability, Account, Role } from './types'
import { ApiService } from './api.service'

import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'hub-work',
  templateUrl: './work-detail.component.html'
})
export class WorkDetailComponent implements OnInit {
  work:Work = null
  workid:string
  performances:Performance[]
  downloads:Download[]
  error:string = null
  error2:string = null
  error3:string = null
  loading:boolean = true
  loading2:boolean = true
  loading3:boolean = true
  canEditRoles:boolean = false
  roleAssignments:RoleAssignment[]
  accounts:Account[]
  addRoleAccountid:number
  savingRoles:boolean
  roleError:string
    
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api:ApiService
  ) {}
    
  ngOnInit(): void {
    // use as Observable directly?!
    this.route.paramMap
      .subscribe((params: ParamMap) => {
        console.log(`work-detail switch to ${params.get('workid')}`)
        this.workid = params.get('workid')
        this.work = null
        this.performances = []
        this.downloads = []
        this.error = this.error2 = this.error3 = null
        this.loading = this.loading2 = this.loading3 = true
        this.roleError = null
        this.api.getWork(params.get('workid')).subscribe(
          (res) => { this.work = res; this.loading=false; },
          (err) => { this.error = err.message; this.loading=false }
        )
        this.api.getPerformancesOfWork(params.get('workid')).subscribe(
          (res) => { this.performances = res; this.loading2=false; },
          (err) => { this.error2 = err.message; this.loading2=false }
        )
        this.api.getDownloadsForWork(params.get('workid')).subscribe(
          (res) => { this.downloads = res; this.loading3=false; },
          (err) => { this.error3 = err.message; this.loading3=false }
        )
        this.canEditRoles = false
        this.roleAssignments = null
        this.api.hasCapabilityOnWork(Capability.EditRolesWork, params.get('workid')).subscribe(
          (res) => { 
            this.canEditRoles = res 
            if (this.canEditRoles)
              this.api.getRolesForWork(params.get('workid')).subscribe(
                (res) => { this.roleAssignments = res; },
                (err) => { console.log('error getting role assignments', err) }
              )
          },
          (err) => { console.log('error checking EditRolesWork') }
        )
        this.api.getAccounts().subscribe(
          (res) => { this.accounts = res; },
          (err) => { console.log('error getting accounts', err) }
        )
      })
  }
  addOwner() {
    this.saveRole(this.addRoleAccountid, Role.Owner, this.workid, true)
  }
  addPerformer() {
    this.saveRole(this.addRoleAccountid, Role.Performer, this.workid, true)
  }
  removeRoleAssignent(ra:RoleAssignment) {
    this.saveRole(ra.accountid, ra.role, ra.workid, false)
  }
  saveRole(accountid:number, role:string, workid:string, grant:boolean) {
    if (accountid===null || accountid===undefined)
      return
    this.savingRoles = true
    this.roleError = null
    this.api.setWorkAccountRole(workid, String(accountid), role, grant).subscribe(
      (res)  => { 
        this.savingRoles = false
        this.api.getRolesForWork(this.workid).subscribe(
          (res) => { this.roleAssignments = res; },
          (err) => { console.log('error re-getting role assignments', err) }
        )
      },
      (err) => {
        this.savingRoles = false
        this.roleError = this.api.getMessageForError(err)
      }
    )
  }
}
