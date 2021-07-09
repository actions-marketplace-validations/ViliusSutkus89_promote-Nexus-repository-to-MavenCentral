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
  const user = getInput('sonatypeUsername')
  const pass = getInput('sonatypePassword')
  const userPass = `${user}:${pass}`
  const userPassBase64 = Buffer.from(userPass).toString('base64')
  setSecret(userPassBase64)
  const authorizationHeader = `Basic ${userPassBase64}`
  const repositoryURI = getInput('repositoryURI')
  const printResponseBodyInErrors = getBooleanInput('printResponseBodyInErrors')
  const censorProfileId = getBooleanInput('censorProfileId')
  try {
    const sc = new SonatypeClient(
      repositoryURI,
      authorizationHeader,
      printResponseBodyInErrors,
      censorProfileId
    )
    const mavenCentralURL = getInput('mavenCentralURL')
    setOutput('artifacts', await sc.obtainArtifactURLs(mavenCentralURL))
    await sc.sendPromoteRequest()
  } catch (err) {
    setFailed(err)
  }
}

run()
