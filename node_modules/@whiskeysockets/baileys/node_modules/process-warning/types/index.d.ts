declare namespace processWarning {
  export interface WarningItem {
    (a?: any, b?: any, c?: any): boolean;
    name: string;
    code: string;
    message: string;
    emitted: boolean;
    unlimited: boolean;
    format(a?: any, b?: any, c?: any): string;
  }

  export type WarningOptions = {
    name: string;
    code: string;
    message: string;
    unlimited?: boolean;
  }

  export type DeprecationOptions = Omit<WarningOptions, 'name'>

  export type ProcessWarningOptions = {
    unlimited?: boolean;
  }

  export type WarningSpyData = {
    calls: WarningCallData[],
    callCount(): number
    reset(): void
    restore(): void
  }

  export type WarningCallData = {
    arguments: unknown[]
    result: boolean
  }

  export type ProcessWarning = {
    createWarning(params: WarningOptions): WarningItem;
    createDeprecation(params: DeprecationOptions): WarningItem;
    spyWarning(warning: WarningItem): WarningSpyData
  }

  export function createWarning (params: WarningOptions): WarningItem
  export function createDeprecation (params: DeprecationOptions): WarningItem
  export function spyWarning (warning: WarningItem): WarningSpyData

  const processWarning: ProcessWarning
  export { processWarning as default }
}

export = processWarning
