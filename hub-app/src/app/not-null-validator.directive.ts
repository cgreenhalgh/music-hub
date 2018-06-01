import { AbstractControl, ValidatorFn } from '@angular/forms';

export function notNullValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} => {
    const forbidden = "null"==control.value || null===control.value
    return forbidden ? {'notNull': {value: control.value}} : null;
  };
}