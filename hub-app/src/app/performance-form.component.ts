import { Component, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Performance } from './types';
import { ApiService } from './api.service'

@Component({
  selector: 'hub-performance-form',
  templateUrl: './performance-form.component.html'
})
export class PerformanceFormComponent implements OnChanges  {
  @Input() performance: Performance;
  @Input() disabled: boolean;
  @Output() save: EventEmitter<Performance> = new EventEmitter();
  @Output() cancel: EventEmitter<any> = new EventEmitter();
  performanceForm: FormGroup
  statuses:String[] = ["CONFIRMED"]
  performances:Performance[]
  loadingPerformances:boolean = false
  errorPerformances:string = null
  
  constructor(
    private fb: FormBuilder, 
    private api:ApiService
  ) { 
    this.createForm();
  }

  createForm() { 
    this.performanceForm = this.fb.group({
      title: ['', Validators.required ],
      description: '',
      performer_title: ['', Validators.required ],
      performer_bio: '',
      location: ['', Validators.required ],
      venue_title: ['', Validators.required ],
      date: ['', Validators.pattern('^(\\d\\d\\d\\d-\\d\\d-\\d\\d)?$')],
      time: ['', Validators.pattern('^(\\d\\d:\\d\\d:\\d\\d)?$')],
      timezone: ['', Validators.pattern('^([+-]\\d\\d:\\d\\d)?$')],
      ispublic: '',
      status: ['', Validators.required ], 
      linked_performanceid: '',
     });
  }
  ngOnChanges() {
    this.rebuildForm();
    if (this.disabled)
      this.performanceForm.disable();
    else
      this.performanceForm.enable();
  }
  rebuildForm() {
    if (this.performance) {
      this.loadingPerformances = true
      this.performances = null
      this.api.getPerformancesOfWork(String(this.performance.workid)).subscribe(
        (res) => { this.performances = res; this.loadingPerformances=false; },
        (err) => { this.errorPerformances = err.message; this.loadingPerformances=false }
      )
    } else {
      this.errorPerformances = 'No performance specified'
      this.performances = null
    }
    this.performanceForm.reset(this.performance);
  }
  onSubmit() {
    this.performance = this.prepareSavePerformance();
    //this.heroService.updateHero(this.hero).subscribe(/* error handling */);
    this.rebuildForm();
    //console.log('save', this.performance);
    this.save.emit(this.performance);
  }
  prepareSavePerformance(): Performance {
    const formModel = this.performanceForm.value;

    // return new object containing a combination of original value(s)
    // and deep copies of changed form model values
    const p2:Performance = Object.assign({}, this.performance);
    let savePerformance = Object.assign(p2, formModel)
    // hack - probably should do all fields explicitly
    if (savePerformance.linked_performanceid===null || savePerformance.linked_performanceid===undefined || ""==(savePerformance.linked_performanceid as any))
      savePerformance.linked_performanceid = null
    else
      savePerformance.linked_performanceid = Number(savePerformance.linked_performanceid as any)
    return savePerformance;
  }
  revert() {
    this.rebuildForm();
    this.cancel.emit(null);
  }
}