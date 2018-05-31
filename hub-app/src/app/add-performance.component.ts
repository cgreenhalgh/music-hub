import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { Work, Performance } from './types'
import { ApiService } from './api.service'

import 'rxjs/add/operator/switchMap';

@Component({
  selector: 'hub-add-performance',
  templateUrl: './add-performance.component.html'
})
export class AddPerformanceComponent implements OnInit {
  workid:string
  work:Work
  error:string = null
  loading:boolean = true
  saving:boolean
  newPerformance:Performance
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api:ApiService,
  ) {}
    
  ngOnInit(): void {
    // use as Observable directly?!
    this.route.paramMap
      .subscribe((params: ParamMap) => {
        this.workid = params.get('workid')
        console.log(`add-performance switch to ${params.get('workid')}`)
        this.work = null
        this.error = null
        this.loading = true
        this.saving = false
        this.api.getWork(this.workid).subscribe(
          (res) => { 
            this.work = res; 
            this.newPerformance = {
              workid: Number(this.workid),
              work: this.work,
              linked_performanceid: null,
              ispublic: false,
            } as Performance
            this.loading=false; 
          },
          (err) => { this.error = err.message; this.loading=false }
        )
      })
  }
  cancel() {
    this.router.navigate(['work',this.workid])
  }
  save(p: Performance) {
    console.log('save', p)
    this.saving = true
    this.error = null
    this.api.postPerformanceOfWork(p, this.workid).subscribe(
      (res) => {
        console.log('added performance '+res.id)
        this.router.navigate(['performance', String(res.id) )
      },
      (err) => { 
        this.error = this.api.getMessageForError(err)
        this.saving = false
      }
    )
  }
}
