import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import * as FileSaver from 'file-saver'
import { RecordingAndFile } from './recording-form.component';

import { Work, Performance, Plugin, PluginAction, PerformanceIntegration, Recording } from './types'
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
  performanceid:string
  error:string = null
  loading:boolean = true
  actions:ActionRecord[] = []
  currentAction:PluginAction = null
  errorRecordings:string = null
  loadingRecordings:boolean = true
  recordings:Recording[] = []
  publicrecordingurl:string = null // nasty climb-specific hack for public url
  addingRecording:boolean = false
  newRecording:Recording = null
  editedRecording:Recording = null
  savingRecording:boolean
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
        this.performanceid = params.get('performanceid')
        console.log(`integration-detail switch to ${params.get('performanceid')} ${params.get('pluginid')}`)
        this.perfint = null
        this.error = null
        this.loading = true
        this.publicrecordingurl = null
        this.editedRecording = null
        this.newRecording = null
        this.savingRecording = false
        this.addingRecording = false
        this.api.getPerformanceIntegration(params.get('performanceid'), params.get('pluginid')).subscribe(
          (res) => { this.perfint = res; this.updateUrls(); this.loading=false; },
          (err) => { this.error = err.message; this.loading=false }
        )
        this.refreshRecordings()
      })
  }
  refreshRecordings():void {
    this.errorRecordings = null
    this.loadingRecordings = true
    this.api.getPerformanceRecordings(this.performanceid).subscribe(
      (res) => { this.recordings = res; this.loadingRecordings =false; },
      (err) => { this.errorRecordings = err.message; this.loadingRecordings=false }
    )
  }
  updateUrls(): void {
    // nasty climb-specific hack for public url = plugin setting "publicrecordingurl"
    this.publicrecordingurl = this.perfint.plugin.settings.filter((s) => 'publicrecordingurl'==s.name).map((s) => s.value).find(() => true)
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
    this.actions.splice(0, 0, actionres)
    this.api.doIntegrationAction(String(this.perfint.performanceid), String(this.perfint.pluginid), action.id).
    subscribe((res) => {
        if (res.error) {
          actionres.error = true
          actionres.text = `${action.title} error: ${res.message}: ${res.error.message}`
        } else {
          actionres.success = true
          actionres.text = `${action.title}: ${res.message}`
          if (res.download) {
            let blob = new Blob([res.download.data], {
              type: res.download.mimeType
            });
            console.log(`save download ${res.download.filename}`)
            FileSaver.saveAs(blob, res.download.filename);
          }
        }
      },
      (err) => {
        actionres.error = true
        actionres.text = `${action.title} error: `+this.api.getMessageForError(err)
      }
    )
  }
  
  addRecording():void {
    console.log('add recording...')
    this.newRecording = {
      workid: this.perfint.performance.workid,
      id: -1,
      performanceid: this.perfint.performanceid,
      perspective:'default', 
      ispublic:false, 
      relpath: '',
      mimetype: '',
      start_time_offset:0
    }
    this.addingRecording = true
  }
  cancelAddRecording():void {
    this.addingRecording = false
    this.newRecording = null
    this.savingRecording = false
    this.errorRecordings = null
  }
  saveNewRecording(recording:RecordingAndFile):void {
    console.log('save new recording', recording)
    this.savingRecording = true
    this.api.postRecordingOfPerformance(recording.recording, recording.file).subscribe(
      (res) => { this.refreshRecordings(); this.savingRecording=false; this.addingRecording=false; this.newRecording = null },
      (err) => { this.errorRecordings = this.api.getMessageForError(err); this.savingRecording=false }
    )
  }
  editRecording(recording:Recording):void {
    this.editedRecording = recording
  }
  cancelEditRecording(): void {
    this.editedRecording = null;
    this.savingRecording = false
    this.errorRecordings = null
  }
  saveEditRecording(recording:RecordingAndFile): void {
    console.log('save edited recording', recording.recording)
    this.savingRecording = true
    this.api.putRecording(recording.recording).subscribe(
      (res) => { this.refreshRecordings(); this.savingRecording=false; this.editedRecording = null },
      (err) => { this.errorRecordings = this.api.getMessageForError(err); this.savingRecording=false }
    )
  }
}
