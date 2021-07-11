import {
  getInput,
  getBooleanInput,
  setFailed,
  setSecret,
  setOutput
} from '@actions/core'
import {Buffer} from 'buffer'
import {SonatypeClient} from './SonatypeClient'

async function run(): Promise<void> {
  const user = getInput('sonatypeUsername', {required: true})
  const pass = getInput('sonatypePassword', {required: true})
  const userPass = `${user}:${pass}`
  const userPassBase64 = Buffer.from(userPass).toString('base64')
  setSecret(userPassBase64)
  const authorizationHeader = `Basic ${userPassBase64}`
  const repositoryURL = getInput('repositoryURL', {required: true})
  const printResponseBodyInErrors = getBooleanInput(
    'printResponseBodyInErrors',
    {required: false}
  )
  const censorProfileId = getBooleanInput('censorProfileId', {required: false})
  try {
    const sc = new SonatypeClient(
      repositoryURL,
      authorizationHeader,
      printResponseBodyInErrors,
      censorProfileId
    )
    const mavenCentralURL = getInput('mavenCentralURL', {required: false})
    setOutput('artifacts', await sc.obtainArtifactURLs(mavenCentralURL))
    await sc.sendPromoteRequest()
  } catch (err) {
    setFailed(err)
  }
}

run()
