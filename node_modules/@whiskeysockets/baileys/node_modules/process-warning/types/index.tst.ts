import { expect } from 'tstyche'
import { createDeprecation, createWarning, spyWarning, WarningCallData, WarningSpyData } from '..'

const WarnInstance = createWarning({
  name: 'TypeScriptWarning',
  code: 'CODE',
  message: 'message'
})

expect(WarnInstance.code).type.toBe<string>()
expect(WarnInstance.message).type.toBe<string>()
expect(WarnInstance.name).type.toBe<string>()
expect(WarnInstance.emitted).type.toBe<boolean>()
expect(WarnInstance.unlimited).type.toBe<boolean>()

expect(WarnInstance()).type.toBe<boolean>()
expect(WarnInstance('foo')).type.toBe<boolean>()
expect(WarnInstance('foo', 'bar')).type.toBe<boolean>()

const buildWarnUnlimited = createWarning({
  name: 'TypeScriptWarning',
  code: 'CODE',
  message: 'message',
  unlimited: true
})

expect(buildWarnUnlimited.unlimited).type.toBe<boolean>()

const DeprecationInstance = createDeprecation({
  code: 'CODE',
  message: 'message'
})

expect(DeprecationInstance.code).type.toBe<string>()

expect(DeprecationInstance()).type.toBe<boolean>()
expect(DeprecationInstance('foo')).type.toBe<boolean>()
expect(DeprecationInstance('foo', 'bar')).type.toBe<boolean>()

const spyData = spyWarning(WarnInstance)
expect(spyData).type.toBe<WarningSpyData>()
expect(spyData.calls).type.toBe<WarningCallData[]>()
expect(spyData.callCount).type.toBe<(() => number)>()
expect(spyData.callCount()).type.toBe<number>()
expect(spyData.reset).type.toBe<(() => void)>()
expect(spyData.reset()).type.toBe<void>()
expect(spyData.restore).type.toBe<(() => void)>()
expect(spyData.restore()).type.toBe<void>()
