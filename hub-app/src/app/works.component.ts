import { Component, OnInit } from '@angular/core';

import { Work } from './types'
import { ApiService } from './api.service'

@Component({
  selector: 'hub-works',
  templateUrl: './works.component.html'
})
export class WorksComponent implements OnInit {
  works:Work[] = []
  error:string = null
  loading:boolean = true
  constructor(private api:ApiService) {}
    
  ngOnInit(): void {
    this.api.getWorks().subscribe(
      (res) => { this.works = res; this.loading=false; },
      (err) => { this.error = err.message; this.loading=false }
    )  
  }
}
