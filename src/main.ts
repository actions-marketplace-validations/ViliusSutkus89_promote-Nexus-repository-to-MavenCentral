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
  let user: string
  let pass: string
  let repositoryURL: string
  let printResponseBodyInErrors: boolean
  let censorProfileId: boolean
  try {
    user = getInput('sonatypeUsername', {required: true})
    pass = getInput('sonatypePassword', {required: true})
    repositoryURL = getInput('repositoryURL', {required: true})
    printResponseBodyInErrors = getBooleanInput('printResponseBodyInErrors', {
      required: false
    })
    censorProfileId = getBooleanInput('censorProfileId', {required: false})
  } catch (err) {
    setFailed(err)
    return
  }

  const userPass = `${user}:${pass}`
  const userPassBase64 = Buffer.from(userPass).toString('base64')
  setSecret(userPassBase64)
  const authorizationHeader = `Basic ${userPassBase64}`
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
    return
  }
}

run()
