
import { mainCetusClmmSDK, testCetusClmmSDK, mainSuiClient, testSuiClient, mainTurbosSDK, testTurbosSDK } from './constant';

import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { Network, TurbosSdk } from 'turbos-clmm-sdk';
const cron = require('node-cron');

import { addPoolsInfo, checkCollectionExists, insertPoolData } from './pools';
import { SUI_TYPE } from '../config/constants';
const cetusClmmSDK = initCetusSDK({ network: 'mainnet' });

export const turbosSdk = new TurbosSdk(Network.mainnet);


//get pool addresses which sell or buy sui token

export async function startCron() {
  console.log(' ========== DEX pool configuring... ========== ');
  cron.schedule('0 0 * * * ', async () => {
    try {
      const suiPools = await getCetusSuiSwapPoolAddresses();
      const turbosPools = await getTurbosSuiSwapPoolAddresses()

      insertPoolData([...suiPools, ...turbosPools]);
    } catch (error) {
      console.error('Error executing cron task:', error);
    }
  });

  const exit = await checkCollectionExists(false);
  if (!exit) {
    const suiPools = await getCetusSuiSwapPoolAddresses();
    const turbosPools = await getTurbosSuiSwapPoolAddresses();

    await insertPoolData([...suiPools, ...turbosPools]);
  }
  console.log(' ========== DEX pool configuration done! ========== ');
}

export async function getCetusSuiSwapPoolAddresses() {
  const allPools = await cetusClmmSDK.Pool.getPoolsWithPage();
  console.log('allPools.length = ', allPools.length);

  const suiPools = allPools.filter(pool => {
    return pool.poolType.includes('::sui::SUI');
  }).map((pool: any) => {
    return {
      dexName: 'cetus',
      poolAddress: pool.poolAddress,
      poolType: pool.poolType,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB
    }
  })

  return suiPools;
}

export async function getTurbosSuiSwapPoolAddresses() {
  console.log(' ========== getTurbosSuiSwapPoolAddresses =========== ');
  const allPools = await turbosSdk.pool.getPools();
  console.log('TurbosPool length = ', allPools.length);

  const suiPools = allPools.filter(pool => {
    return pool.type.includes('::sui::SUI');
  }).map(pool => {
    return {
      dexName: 'turbos',
      poolAddress: pool.objectId,
      poolType: pool.type,
      coinTypeA: pool.types[0],
      coinTypeB: pool.types[1]
    }
  })

  return suiPools;
}

export async function getCetusSuiSwapPoolAddress() {
  try {
    console.log(' ------------- started ------------- ')
    const allPools = await cetusClmmSDK.Pool.getPoolByCoins(['0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD', '0x2::sui::SUI']);
    // const allPools = await cetusClmmSDK.Pool.getPoolByCoins(['0x2::sui::SUI', '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC' ]);
    console.log('allPools = ', allPools)

    const suiPools = allPools.filter(pool => {
      const poolType = pool.poolType;
      return poolType.includes('::sui::SUI');
    })

    console.log('Pools containing SUI token:');
    suiPools.forEach(pool => {
      console.log(`- ${pool.poolAddress}: ${pool.poolType}`);
    })
  } catch (err) {
    console.error(err);
  }
}

// check Pool if it's connected with specific Token
// export async function checkPoolType(address: string, tokenType: string): Promise<boolean> {
//   try {
//     const pool = await cetusClmmSDK.Pool.getPool(address);
//     console.log('pool = ', pool);
//     return pool?.poolType?.includes(`${tokenType}, 0x2::sui::SUI`) || pool?.poolType?.includes(`0x2::sui::SUI, ${tokenType}`) ? true : false;
//   } catch (error) {
//     console.error(`Error checking pool type for address ${address}:`, error);
//     return false;
//   }
// }

async function checkCetusPoolType(address: string, token: string): Promise<boolean> {
  try {
    const pool = await mainCetusClmmSDK.Pool.getPool(address);
    if (!pool) {
      console.warn(`No pool found for address ${address} on Cetus network`);
      return false;
    }
    return pool.poolType.includes(token) && pool.poolType.includes(SUI_TYPE);
  } catch (error) {
    console.error(`Error checking Cetus pool type for address ${address}:`, error);
    return false;
  }
}

async function checkTurbosPoolType(address: string, token: string): Promise<boolean> {
  try {
    const pool = await mainTurbosSDK.pool.getPool(address);
    if (!pool) {
      console.warn(`No pool found for address ${address} on Turbos network`);
      return false;
    }
    return pool.type.includes(token) && pool.type.includes(SUI_TYPE);
  } catch (error) {
    console.error(`Error checking Turbos pool type for address ${address}:`, error);
    return false;
  }
}

export async function checkPoolType(address: string, token: string, network: string): Promise<boolean> {
  if (network !== "cetus" && network !== "turbos") {
    console.error(`Unsupported network: ${network}`);
    return false;
  }

  try {
    return network === "cetus"
      ? await checkCetusPoolType(address, token)
      : await checkTurbosPoolType(address, token);
  } catch (error) {
    console.error(`Error checking pool type for address ${address} on ${network}:`, error);
    return false;
  }
}