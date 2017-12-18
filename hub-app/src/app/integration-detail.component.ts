import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';

import { Work, Performance, Plugin, PluginAction, PerformanceIntegration } from './types'
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
  actions:ActionRecord[] = []
  currentAction:PluginAction = null
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api:ApiService,
    private modalService: NgbModal
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
  openActionConfirm(content) {
    console.log('open', content)
    this.modalService.open(content).result.then((result) => {
      this.doAction(result as PluginAction)
    }, (reason) => {
    });
  }

  doAction(action:PluginAction): void {
    console.log(`doAction ${action.id} on performance ${this.perfint.performanceid} plugin ${this.perfint.pluginid}`)
    let actionres:ActionRecord = { text: `request ${action.title}...` }
    this.actions.push(actionres)
    this.api.doIntegrationAction(String(this.perfint.performanceid), String(this.perfint.pluginid), action.id).
    subscribe((res) => {
        if (res.error) {
          actionres.error = true
          actionres.text = `${action.title} error: ${res.message}: ${res.error.message}`
        } else {
          actionres.success = true
          actionres.text = `${action.title}: ${res.message}`
        }
      },
      (err) => {
        actionres.error = true
        actionres.text = `${action.title} error: `+this.api.getMessageForError(err)
      }
    )
  }
}
