import {test} from '@jest/globals'
import {run} from '../src/run'

test('main', async () => {
  console.log('Running main test')
  await run()
})
