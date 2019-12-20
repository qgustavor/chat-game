import getData from '../api-libs/data-handler'
import parseData from '../api-libs/parser'
import processData from '../api-libs/data-converter'
import uploadData from '../api-libs/data-uploader'

export default async (req, res) => {
  const purge = !!req.query.purge

  try {
    const data = await getData()
    const parsedData = parseData(data)
    const processedData = processData(parsedData)
    await uploadData(processedData, purge)

    res.setHeader('Content-type', 'text/plain')
    res.status(200).send('Compilation done.')
  } catch (error) {
    res.setHeader('Content-type', 'text/html')
    res.status(500).send(
      `<!doctype html><meta charset=utf-8>
      <title>Compilation error</title><style>body{background:#E21;color:#FFF;margin:40px}
      b{color:#DE2}h1{display:inline-block;border-bottom:1px solid #DE2}</style>
      <h1><b>Compilation</b> error</h1><br><pre>${error.stack}`
    )
  }
}
