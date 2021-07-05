import axios, {AxiosResponse} from 'axios'
// eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
const parseApache = require('parse-apache-directory-index')

export async function ParseApacheRecursive(
  url: string,
  maxRecursions = 8
): Promise<string[]> {
  return new Promise<string[]>(async (resolve, reject) => {
    let resultURLs: string[] = []
    try {
      const response: AxiosResponse = await axios.get(url)
      const x = parseApache(response.data)
      for (const obj of x.files) {
        resultURLs.push(obj.path)
        if ('directory' === obj.type && maxRecursions >= 1) {
          resultURLs = resultURLs.concat(
            await ParseApacheRecursive(obj.path, maxRecursions - 1)
          )
        }
      }
      resolve(resultURLs)
    } catch (err) {
      reject(err)
    }
  })
}
