import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AccountComponent } from './account.component';
import { WorksComponent } from './works.component';
import { WorkDetailComponent } from './work-detail.component';

const routes: Routes = [
  { path: '', redirectTo: '/account', pathMatch: 'full' },
  { path: 'account',  component: AccountComponent },
  { path: 'works',  component: WorksComponent },
  { path: 'work/:workid', component: WorkDetailComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}

