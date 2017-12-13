import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { Work, Performance, Plugin, PerformanceIntegration } from './types'
import { ApiService } from './api.service'

import 'rxjs/add/operator/switchMap';

interface ActionRecord {
  text:string
  success?:boolean
  error?:boolean
}

@Component({
  selector: 'hub-work',
  templateUrl: './integration-detail.component.html'
})
export class IntegrationDetailComponent implements OnInit {
  perfint:PerformanceIntegration = null
  error:string = null
  loading:boolean = true
  actions:ActionRecord[] = [ {text:'test'} ]
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api:ApiService
  ) {}
    
  ngOnInit(): void {
    // use as Observable directly?!
    this.route.paramMap
      .subscribe((params: ParamMap) => {
        console.log(`integration-detail switch to ${params.get('performanceid')} ${params.get('pluginid')}`)
        this.perfint = null
        this.error = null
        this.loading = true
        this.api.getPerformanceIntegration(params.get('performanceid'), params.get('pluginid')).subscribe(
          (res) => { this.perfint = res; this.loading=false; },
          (err) => { this.error = err.message; this.loading=false }
        )
      })
  }
  doUpdate(): void {
    console.log(`doUpdate on performance ${this.perfint.performanceid} plugin ${this.perfint.pluginid}`)
    let action:ActionRecord = { text: 'request update...' }
    this.actions.push(action)
    this.api.updateIntegration(String(this.perfint.performanceid), String(this.perfint.pluginid)).
    subscribe((res) => {
        action.success = true
        action.text = 'Updated: '+res
      },
      (err) => {
        action.error = true
        action.text = 'Error doing update: '+this.api.getMessageForError(err)
      }
    )
  }
}
