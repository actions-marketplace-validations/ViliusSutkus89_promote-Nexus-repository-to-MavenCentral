import {getInput, setFailed, setSecret, setOutput} from '@actions/core'
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
  try {
    const sc = new SonatypeClient(repositoryURI, authorizationHeader)
    setOutput('artifacts', await sc.obtainArtifactURLs())
    await sc.sendPromoteRequest()
  } catch (err) {
    setFailed(err)
  }
}

run()
