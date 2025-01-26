import { promises as fs } from 'fs'
import path from 'path'
import { Config } from '@ajna-finance/sdk'

export async function readConfigFile(filePath: string) {
  try {
    const absolutePath = path.resolve(filePath)
    const fileContents = await fs.readFile(absolutePath, 'utf-8')
    return JSON.parse(fileContents)
    // TODO: validate the config
  } catch (error) {
    console.error('Error reading config file:', error)
    process.exit(1)
  }
}

export function configureAjna(ajnaConfig) {
  new Config(
    ajnaConfig.erc20PoolFactory,
    ajnaConfig.erc721PoolFactory,
    ajnaConfig.poolUtils,
    ajnaConfig.positionManager,
    ajnaConfig.ajnaToken,
    ajnaConfig.grantFund,
    ajnaConfig.burnWrapper,
    ajnaConfig.lenderHelper
  )
}
