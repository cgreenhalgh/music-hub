import { Component, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Recording } from './types';
import { ApiService } from './api.service'
import { AbstractControl, ValidatorFn } from '@angular/forms';

export interface RecordingAndFile {
  recording:Recording
  file?:File
}

@Component({
  selector: 'hub-recording-form',
  templateUrl: './recording-form.component.html'
})
export class RecordingFormComponent implements OnChanges  {
  @Input() recording: Recording;
  @Input() disabled: boolean;
  @Input() adding: boolean;
  @Output() save: EventEmitter<RecordingAndFile> = new EventEmitter();
  @Output() cancel: EventEmitter<any> = new EventEmitter();
  recordingForm: FormGroup
  file: File
  
  constructor(
    private fb: FormBuilder
  ) { 
    this.createForm();
  }
  requiredIfAdding(noreverse:boolean): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} => {
      const forbidden = (this.adding !== !noreverse) && ("null"==control.value || null===control.value)
      return forbidden ? {'required': {value: control.value}} : null;
    };
  }

  createForm() { 
    this.recordingForm = this.fb.group({
      perspective: ['', Validators.required ],
      file: ['', this.requiredIfAdding(true) ],
      relpath: [{value:'', disabled:true} ],
      mimetype: ['', this.requiredIfAdding(true) ],
      ispublic: '',
      start_time_offset: ['', Validators.required ],
     });
  }
  ngOnChanges() {
    this.rebuildForm();
    if (this.disabled)
      this.recordingForm.disable();
    else
      this.recordingForm.enable();
  }
  rebuildForm() {
    this.recordingForm.reset(this.recording);
    this.recordingForm.get('relpath').disable()
  }
  fileUpdated($event) {
    const files = $event.target.files || $event.srcElement.files;
    this.file = files[0];
    console.log('change file', this.file)
  }
  onSubmit() {
    this.recording = this.prepareSaveRecording();
    let result:RecordingAndFile = {
      recording: this.recording,
      file: this.file
    }
    //this.heroService.updateHero(this.hero).subscribe(/* error handling */);
    this.rebuildForm();
    //console.log('save', this.performance);
    this.save.emit(result);
  }
  prepareSaveRecording(): Recording {
    const formModel = this.recordingForm.value;
    // return new object containing a combination of original value(s)
    // and deep copies of changed form model values
    const saveRecording :Recording = Object.assign({}, this.recording);
    saveRecording.perspective = formModel.perspective as string
    saveRecording.start_time_offset = Number(formModel.start_time_offset)
    saveRecording.ispublic = !!formModel.ispublic
    saveRecording.relpath = this.adding ? formModel.file : formModel.relpath
    saveRecording.mimetype = ''==formModel.mimetype ? null : formModel.mimetype as string
    return saveRecording;
  }
  revert() {
    this.rebuildForm();
    this.cancel.emit(null);
  }
}