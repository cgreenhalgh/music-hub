// climbapp plugin
import { PluginProvider, registerPlugin } from './plugins'
import { PerformanceIntegration } from './types'

export class ClimbappPlugin extends PluginProvider {
  constructor(perfint:PerformanceIntegration) {
    super(perfint)
    console.log(`Create climbapp integration ${this.perfint.id} for performance ${this.perfint.performanceid}`)
  }
  getCode(): string {
    return 'climbapp'
  }
  enable(): void {
    // TODO
  }
  disable(): void {
    // TODO
  }
  update(): void {
    console.log(`update climbapp integration ${this.perfint.id} for performance ${this.perfint.performanceid}`)
    // TODO
  }
}

