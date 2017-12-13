import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HttpClientModule }    from '@angular/common/http';


import { AppComponent } from './app.component';
import { WorksComponent } from './works.component';
import { WorkDetailComponent } from './work-detail.component';
import { PerformanceDetailComponent } from './performance-detail.component';
import { IntegrationDetailComponent } from './integration-detail.component';
import { AppRoutingModule } from './app-routing.module';
import { AccountComponent } from './account.component';
import { ApiService } from './api.service';

@NgModule({
  declarations: [
    AppComponent,
    WorksComponent,
    WorkDetailComponent,
    PerformanceDetailComponent,
    IntegrationDetailComponent,
    AccountComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    NgbModule.forRoot()
  ],
  providers: [ApiService],
  bootstrap: [AppComponent]
})
export class AppModule { }
