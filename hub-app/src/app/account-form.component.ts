import { Component, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Account } from './types';

@Component({
  selector: 'hub-account-form',
  templateUrl: './account-form.component.html'
})
export class AccountFormComponent implements OnChanges  {
  @Input() account: Account;
  @Input() disabled: boolean;
  @Output() save: EventEmitter<Account> = new EventEmitter();
  @Output() cancel: EventEmitter<any> = new EventEmitter();
  accountForm: FormGroup
  
  constructor(
    private fb: FormBuilder
  ) { 
    this.createForm();
  }
  createForm() { 
    this.accountForm = this.fb.group({
      nickname: ['', Validators.required ],
      email: ['', Validators.required ],
      description: '',
      password: ['', Validators.required ],
     });
  }
  ngOnChanges() {
    this.rebuildForm();
    if (this.disabled)
      this.accountForm.disable();
    else
      this.accountForm.enable();
  }
  rebuildForm() {
    this.accountForm.reset(this.account);
  }
  onSubmit() {
    this.account = this.prepareSaveAccount()
    this.rebuildForm();
    this.save.emit(this.account);
  }
  prepareSaveAccount(): Account {
    const formModel = this.accountForm.value;
    const saveAccount:Account = {
      id: this.account.id,
      nickname: formModel.nickname,
      description: formModel.description,
      email: formModel.email,
      password: (""==formModel.password) ? null : formModel.password
    }
    return saveAccount;
  }
  revert() {
    this.rebuildForm();
    this.cancel.emit(null);
  }

}