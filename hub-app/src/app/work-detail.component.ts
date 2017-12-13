import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { Work, Performance } from './types'
import { ApiService } from './api.service'

import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'hub-work',
  templateUrl: './work-detail.component.html'
})
export class WorkDetailComponent implements OnInit {
  work:Work = null
  performances:Performance[]
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
        console.log(`work-detail switch to ${params.get('workid')}`)
        this.work = null
        this.performances = []
        this.error = this.error2 = null
        this.loading = this.loading2 = true
        this.api.getWork(params.get('workid')).subscribe(
          (res) => { this.work = res; this.loading=false; },
          (err) => { this.error = err.message; this.loading=false }
        )
        this.api.getPerformancesOfWork(params.get('workid')).subscribe(
          (res) => { this.performances = res; this.loading2=false; },
          (err) => { this.error2 = err.message; this.loading2=false }
        )
      })
  }
}
