// src/smart-dex-manager.ts
import { Signer } from 'ethers';
import { PoolConfig, LiquiditySource } from './config-types';
import { logger } from './logging';

/**
 * Deployment types supported by the smart detection system
 * - single: Use existing AjnaKeeperTaker.sol approach (major chains)
 * - factory: Use factory pattern with multiple DEX implementations (newer chains)  
 * - none: No DEX integration available, arbTake/settlement only
 */
export type DeploymentType = 'factory' | 'single' | 'none';

/**
 * Minimal config interface for smart detection - only the fields we actually need
 */
interface SmartDexConfig {
  keeperTaker?: string;
  keeperTakerFactory?: string;
  takerContracts?: { [source: string]: string };
  oneInchRouters?: { [chainId: number]: string };
  pools?: Array<{ take?: { liquiditySource?: any } }>;
}


/**
 * Smart DEX Manager - Analyzes configuration and routes to appropriate take implementation
 * 
 * This enables backward compatibility with existing single-contract deployments
 * while supporting multi-DEX factory deployments on newer chains.
 */
export class SmartDexManager {
  private signer: Signer;
  private config: SmartDexConfig;

  constructor(signer: Signer, config: SmartDexConfig) {
    this.signer = signer;
    this.config = config;
  }

  /**
   * Analyzes the configuration to determine what type of deployment is available
   * Priority order: factory > single > none
   */
  async detectDeploymentType(): Promise<DeploymentType> {
    // Factory pattern deployment - new approach for multi-DEX support
    if (this.config.keeperTakerFactory && this.config.takerContracts) {
      logger.debug('Smart Detection: Factory deployment detected - multi-DEX support available');
      return 'factory';
    }
    
    // Single contract deployment - existing approach for major chains
    if (this.config.keeperTaker) {
      logger.debug('Smart Detection: Single contract deployment detected - using existing 1inch integration');
      return 'single';
    }
    
    // No DEX integration available - arbTake and settlement only
    logger.warn('Smart Detection: No DEX integration configured - arbTake and settlement only');
    return 'none';
  }

  /**
   * Determines if external take (with DEX swap) is possible for this pool configuration
   * Checks both deployment type and pool-specific take settings
   */
  async canTakeLiquidation(poolConfig: PoolConfig): Promise<boolean> {
    const deploymentType = await this.detectDeploymentType();
    
    switch (deploymentType) {
      case 'single':
        // Single contract approach - check if liquiditySource is configured (existing logic)
        const canTakeSingle = !!(poolConfig.take?.liquiditySource && poolConfig.take?.marketPriceFactor);
        logger.debug(`Single deployment - can take: ${canTakeSingle} for pool ${poolConfig.name}`);
        return canTakeSingle;
        
      case 'factory':
        // Factory approach - check if any DEX sources are configured (future implementation)
        // For now, return false until we implement the provider system
        logger.debug(`Factory deployment - take capability not yet implemented for pool ${poolConfig.name}`);
        return false;
        
      case 'none':
        // No external DEX - only arbTake possible
        logger.debug(`No DEX deployment - external takes not possible for pool ${poolConfig.name}`);
        return false;
    }
  }

  /**
   * Validates that the detected deployment type has all required configuration
   * Helps catch configuration errors early
   */
  async validateDeployment(): Promise<{ valid: boolean; errors: string[] }> {
    const deploymentType = await this.detectDeploymentType();
    const errors: string[] = [];

    switch (deploymentType) {
      case 'single':
        if (!this.config.keeperTaker) {
          errors.push('Single deployment requires keeperTaker address');
        }
        // Check if any pools are configured for takes
        const poolsWithTakes = (this.config.pools || []).filter(p => p.take?.liquiditySource);
        if (poolsWithTakes.length > 0) {
          // Validate 1inch-specific requirements
          if (!this.config.oneInchRouters) {
            errors.push('Pools configured for takes but oneInchRouters missing');
          }
        }
        break;
        
      case 'factory':
        if (!this.config.keeperTakerFactory) {
          errors.push('Factory deployment requires keeperTakerFactory address');
        }
        if (!this.config.takerContracts || Object.keys(this.config.takerContracts).length === 0) {
          errors.push('Factory deployment requires at least one takerContracts entry');
        }
        break;
        
      case 'none':
        // No validation needed - arbTake/settlement doesn't require external contracts
        logger.debug('No external take capability - this is valid for arbTake/settlement only operation');
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
