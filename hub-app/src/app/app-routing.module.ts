import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AccountComponent } from './account.component';
import { AccountsListComponent } from './accounts-list.component';
import { WorksComponent } from './works.component';
import { WorkDetailComponent } from './work-detail.component';
import { AddPerformanceComponent } from './add-performance.component';
import { PerformanceDetailComponent } from './performance-detail.component';
import { IntegrationDetailComponent } from './integration-detail.component';

const routes: Routes = [
  { path: '', redirectTo: '/account', pathMatch: 'full' },
  { path: 'account',  component: AccountComponent },
  { path: 'accounts',  component: AccountsListComponent },
  { path: 'works',  component: WorksComponent },
  { path: 'work/:workid', component: WorkDetailComponent },
  { path: 'work/:workid/add', component: AddPerformanceComponent },
  { path: 'performance/:performanceid', component: PerformanceDetailComponent },
  { path: 'performance/:performanceid/integration/:pluginid', component: IntegrationDetailComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}

