import { Component, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Performance } from './types';

@Component({
  selector: 'hub-performance-form',
  templateUrl: './performance-form.component.html'
})
export class PerformanceFormComponent implements OnChanges  {
  @Input() performance: Performance;
  @Input() disabled: boolean;
  @Output() save: EventEmitter<any> = new EventEmitter();
  @Output() cancel: EventEmitter<any> = new EventEmitter();
  performanceForm: FormGroup
  statuses:String[] = ["CONFIRMED"]
  constructor(private fb: FormBuilder) { 
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
      // date, time, timezone, 
      ispublic: '',
      status: ['', Validators.required ], 
      //linked_performanceid
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
    const savePerformance = Object.assign(p2, formModel)
    return savePerformance;
  }
  revert() {
    this.rebuildForm();
    this.cancel.emit(null);
  }
}