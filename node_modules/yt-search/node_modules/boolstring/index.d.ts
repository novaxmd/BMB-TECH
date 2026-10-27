// index.d.ts
declare type trueWords = 'true' | 'yes' | 'enable' | 'enabled' | 'valid' | 'validated' | 'active' | 'activated' | 'permit' | 'permitted' | 'allow' | 'allowed' | 'pass' | 'passed' | 'on' | '1';

declare function boolString(string: string): boolean;

export = boolString;