import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { notNullValidator } from './not-null-validator.directive';

import { Work, Performance, Plugin, PerformanceIntegration, RoleAssignment, Capability, Role, Account, Plugin } from './types'
import { ApiService } from './api.service'

import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'hub-performance',
  templateUrl: './performance-detail.component.html'
})
export class PerformanceDetailComponent implements OnInit {
  performance:Performance = null
  performanceid:string
  editPerformance:Performance
  performanceIntegrations:PerformanceIntegration[]
  editing:boolean = false
  saving:boolean = false
  error:string = null
  error2:string = null
  errorEdit:string = null
  loading:boolean = true
  loading2:boolean = true
  canEditRoles:boolean = false
  roleAssignments:RoleAssignment[]
  accounts:Account[]
  addRoleAccountid:number
  savingRoles:boolean
  roleError:string
  canCreatePerfints:boolean
  plugins:Plugin[]
  pluginForm: FormGroup
  perfint:PerformanceIntegration
    
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder, 
    private api:ApiService
  ) {
    this.createForm();
  }
  createForm() { 
    this.pluginForm = this.fb.group({
      pluginid: ['', notNullValidator() ],
      guid: ['', Validators.required ],
     });
  }
  rebuildForm() {
    this.pluginForm.reset(this.perfint);
  }

  ngOnInit(): void {
    // use as Observable directly?!
    this.route.paramMap
      .subscribe((params: ParamMap) => {
        console.log(`performance-detail switch to ${params.get('performanceid')}`)
        this.performanceid = params.get('performanceid')
        this.performance = null
        this.performanceIntegrations = []
        this.error = this.error2 = null
        this.loading = this.loading2 = true
        this.editing = this.saving = false
        this.editPerformance = null
        this.roleError = null
        this.api.getPerformance(params.get('performanceid')).subscribe(
          (res) => { this.performance = res; this.loading=false; },
          (err) => { this.error = err.message; this.loading=false }
        )
        this.api.getPerformanceIntegrations(params.get('performanceid')).subscribe(
          (res) => { this.performanceIntegrations = res; this.loading2=false; },
          (err) => { this.error2 = err.message; this.loading2=false }
        )
        this.canEditRoles = false
        this.roleAssignments = null
        this.api.hasCapabilityOnPerformance(Capability.EditRolesPerformance, params.get('performanceid')).subscribe(
          (res) => { 
            this.canEditRoles = res 
            if (this.canEditRoles)
              this.api.getRolesForPerformance(params.get('performanceid')).subscribe(
                (res) => { this.roleAssignments = res; },
                (err) => { console.log('error getting role assignments', err) }
              )
          },
          (err) => { console.log('error checking EditRolesPerformance') }
        )
        this.canCreatePerfints = false
        this.plugins = null
        this.api.hasCapabilityOnPerformance(Capability.CreatePerformanceIntegration, params.get('performanceid')).subscribe(
          (res) => { 
            this.canCreatePerfints = res 
            if (this.canCreatePerfints)
              this.api.getPlugins().subscribe(
                (res) => { this.plugins = res; },
                (err) => { console.log('error getting plugins', err) }
              )
          },
          (err) => { console.log('error checking CreatePerformanceIntegration') }
        )
        this.api.getAccounts().subscribe(
          (res) => { this.accounts = res; },
          (err) => { console.log('error getting accounts', err) }
        )
        this.savingPlugin = false
        this.perfint = {} as PerformanceIntegration
        this.rebuildForm()
      })
  }
  edit() {
    // clone
    this.editPerformance = Object.assign({}, this.performance)
    this.editing = true
    this.saving = false
    this.errorEdit = null
  }
  cancel(   ) {
    this.editing = false
    this.saving = false
  }
  save(p:Performance) {
    this.editing = false
    console.log('save', p);
    this.saving = true
    this.api.putPerformance(p).subscribe(
      (res) => { this.performance = res; this.saving=false; },
      (err) => { this.errorEdit = this.api.getMessageForError(err); this.saving=false; this.editing=true; console.log('error', err) }
    )
  }
  addPerformanceManager() {
    this.saveRole(this.addRoleAccountid, Role.PerformanceManager, this.performanceid, true)
  }
  removeRoleAssignent(ra:RoleAssignment) {
    this.saveRole(ra.accountid, ra.role, ra.performanceid, false)
  }
  saveRole(accountid:number, role:string, performanceid:string, grant:boolean) {
    if (accountid===null || accountid===undefined)
      return
    this.savingRoles = true
    this.roleError = null
    this.api.setPerformanceAccountRole(performanceid, String(accountid), role, grant).subscribe(
      (res)  => { 
        this.savingRoles = false
        this.api.getRolesForPerformance(performanceid).subscribe(
          (res) => { this.roleAssignments = res; },
          (err) => { console.log('error getting role assignments', err) }
        )
      },
      (err) => {
        this.savingRoles = false
        this.roleError = this.api.getMessageForError(err)
      }
    )
  }
  newPerfint() {
    this.perfint = this.prepareSavePerfint();
    this.rebuildForm();
    this.error2 = null
    console.log('save perfint', this.perfint);
    this.pluginForm.disable()
    this.api.savePerformanceIntegration(this.perfint).subscribe(
      (res) => {
        this.pluginForm.enable()
        this.perfint = {} as PerformanceIntegration
        this.rebuildForm()
        this.api.getPerformanceIntegrations(this.performanceid).subscribe(
          (res) => { this.performanceIntegrations = res; this.loading2=false; },
          (err) => { this.error2 = err.message; this.loading2=false }
        )
      },
      (err) => {
        this.pluginForm.enable()
        this.error2 = this.api.getMessageForError(err)
      }
    )
  }
  prepareSavePerfint(): PerformanceIntegration {
    const formModel = this.pluginForm.value;
    const perfint:PerformanceIntegration = {
      //id:0,
      performanceid: Number(this.performanceid),
      pluginid: formModel.pluginid!=null ? Number(formModel.pluginid) : null,
      guid: formModel.guid,
      enabled: true,
    }
    return perfint;
  }
}
