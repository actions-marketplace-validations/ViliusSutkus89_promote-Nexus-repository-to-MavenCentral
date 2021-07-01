import {getInput, debug, setSecret} from '@actions/core'
import https from 'https'
import {parseStringPromise} from 'xml2js'

function getBooleanInput(inputName: string): boolean {
  switch (getInput(inputName).toLowerCase()) {
    case 'y':
    case 'yes':
    case '1':
    case 'true':
      return true
  }
  return false
}

export class SonatypeClient {
  private readonly sonatypeURI: string
  private readonly repositoryId: string
  private readonly authorizationHeader: string

  constructor(
    uriReturnedByGradleNexusPublishPlugin: string,
    authorizationHeader: string
  ) {
    this.authorizationHeader = authorizationHeader

    const x = uriReturnedByGradleNexusPublishPlugin.match(
      /^(.+)repositories\/(.+)\/content\/?$/
    )
    if (x === null || 3 !== x.length) {
      throw new Error(
        `Failed to parse repository URI: ${uriReturnedByGradleNexusPublishPlugin}`
      )
    }
    this.sonatypeURI = x[1]
    debug(`SonatypeURI: ${this.sonatypeURI}`)

    this.repositoryId = x[2]
    debug(`repositoryID: ${this.repositoryId}`)
  }

  private async getProfileId(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      try {
        const uri = `${this.sonatypeURI}staging/repository/${this.repositoryId}`
        const XMLData = await this.HTTPSRequest(uri, {
          method: 'GET',
          headers: {Authorization: this.authorizationHeader}
        })
        try {
          const responseObj = await parseStringPromise(XMLData)
          const repo = responseObj['stagingProfileRepository']
          resolve(repo['profileId'][0])
        } catch (err) {
          let msg = `Failed to parse response XML from ${uri}!\n${err.message}\n`
          if (getBooleanInput('printResponseBodyInErrors')) {
            msg += XMLData
          }
          reject(new Error(msg))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  async sendPromoteRequest(): Promise<void> {
    const profileId = await this.getProfileId()
    if (getBooleanInput('censorProfileId')) {
      setSecret(profileId)
    }
    const uri = `${this.sonatypeURI}staging/profiles/${profileId}/promote`
    const POSTData = `<promoteRequest><data><stagedRepositoryId>${this.repositoryId}</stagedRepositoryId></data></promoteRequest>`
    const options = {
      method: 'POST',
      headers: {
        Authorization: this.authorizationHeader,
        'Content-Type': 'application/xml',
        'Content-Length': POSTData.length
      }
    }
    await this.HTTPSRequest(uri, options, POSTData)
  }

  private async HTTPSRequest(
    uri: string,
    options: https.RequestOptions,
    data?: string
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      debug(`HTTPSRequest: ${options.method} ${uri}`)
      const request = https.request(uri, options, res => {
        let receivedData = ''
        res.on('data', chunk => {
          receivedData += chunk
        })

        const rejectWrapper = (errMsg: string): void => {
          let msg =
            `Failed to ${options.method} ${uri}!\n` +
            `HTTP status code: ${res.statusCode}\n` +
            `${errMsg}\n`
          if (getBooleanInput('printResponseBodyInErrors')) {
            msg += receivedData
          }
          reject(new Error(msg))
        }

        res.on('end', () => {
          switch (res.statusCode) {
            case 200:
            case 201:
              resolve(receivedData)
              break
            case 401:
              rejectWrapper('Authorization failure!')
              break
            default:
              rejectWrapper(`Unexpected HTTP status code!`)
              break
          }
        })
      })

      if (data !== undefined) {
        request.write(data)
      }

      request.on('error', reject)
      request.end()
    })
  }
}
