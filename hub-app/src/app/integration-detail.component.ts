import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { Work, Performance, Plugin, PerformanceIntegration } from './types'
import { ApiService } from './api.service'

import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'hub-work',
  templateUrl: './integration-detail.component.html'
})
export class IntegrationDetailComponent implements OnInit {
  perfint:PerformanceIntegration = null
  error:string = null
  loading:boolean = true
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
}
