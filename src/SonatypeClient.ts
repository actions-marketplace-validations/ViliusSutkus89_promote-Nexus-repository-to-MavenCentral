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

interface StagingProfileRepository {
  readonly profileId: string
  readonly type: string
  readonly repositoryURI: string
}

export class SonatypeClient {
  private readonly sonatypeURI: string
  private readonly repositoryId: string
  private readonly authorizationHeader: string

  private readonly initPromise: Promise<StagingProfileRepository>

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

    this.initPromise = new Promise<StagingProfileRepository>(
      async (resolve, reject) => {
        const url = `${this.sonatypeURI}staging/repository/${this.repositoryId}`
        let XMLData
        try {
          XMLData = await this.HTTPSRequest(url, {
            method: 'GET',
            headers: {Authorization: this.authorizationHeader}
          })
        } catch (err) {
          reject(err)
          return
        }

        let responseObj
        try {
          responseObj = await parseStringPromise(XMLData)
        } catch (err) {
          let msg = `${url}: xml2js parser error!`
          if (getBooleanInput('printResponseBodyInErrors')) {
            msg += `\n${err.message}\n${XMLData}`
          }
          reject(new Error(msg))
          return
        }

        const censorProfileId = getBooleanInput('censorProfileId')
        try {
          const repo = responseObj['stagingProfileRepository']
          if (censorProfileId) {
            setSecret(repo['profileId'][0])
          }

          const sp: StagingProfileRepository = {
            profileId: repo['profileId'][0],
            type: repo['type'][0],
            repositoryURI: repo['repositoryURI'][0]
          }

          if ('closed' !== sp.type.toLowerCase()) {
            reject(new Error('Staging repository is not closed!'))
            return
          }

          resolve(sp)
        } catch (err) {
          let msg = `${url}: Failed to parse response!`
          if (getBooleanInput('printResponseBodyInErrors')) {
            msg += `\n${err.message}\n`
            msg += JSON.stringify(responseObj)
          }
          reject(new Error(msg))
        }
      }
    )
  }

  async sendPromoteRequest(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      let sp: StagingProfileRepository
      try {
        sp = await this.initPromise
      } catch (err) {
        reject(err)
        return
      }

      const url = `${this.sonatypeURI}staging/profiles/${sp.profileId}/promote`
      const POSTData = `<promoteRequest><data><stagedRepositoryId>${this.repositoryId}111</stagedRepositoryId></data></promoteRequest>`
      const options = {
        headers: {
          Authorization: this.authorizationHeader,
          'Content-Type': 'application/xml',
          'Content-Length': POSTData.length
        }
      }

      try {
        await this.HTTPSRequest(url, options, POSTData)
        resolve()
      } catch (err) {
        const msg = `Failed to send promote request!\n${err.message}`
        reject(new Error(msg))
      }
    })
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
