import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { Work, Performance, Plugin, PerformanceIntegration } from './types'
import { ApiService } from './api.service'

import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'hub-performance',
  templateUrl: './performance-detail.component.html'
})
export class PerformanceDetailComponent implements OnInit {
  performance:Performance = null
  performanceIntegrations:PerformanceIntegration[]
  error:string = null
  error2:string = null
  loading:boolean = true
  loading2:boolean = true
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api:ApiService
  ) {}
    
  ngOnInit(): void {
    // use as Observable directly?!
    this.route.paramMap
      .subscribe((params: ParamMap) => {
        console.log(`performance-detail switch to ${params.get('performanceid')}`)
        this.performance = null
        this.performanceIntegrations = []
        this.error = this.error2 = null
        this.loading = this.loading2 = true
        this.api.getPerformance(params.get('performanceid')).subscribe(
          (res) => { this.performance = res; this.loading=false; },
          (err) => { this.error = err.message; this.loading=false }
        )
        this.api.getPerformanceIntegrations(params.get('performanceid')).subscribe(
          (res) => { this.performanceIntegrations = res; this.loading2=false; },
          (err) => { this.error2 = err.message; this.loading2=false }
        )
      })
  }
}
