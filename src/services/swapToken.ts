import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { adjustForSlippage, d, Percentage } from '@cetusprotocol/cetus-sui-clmm-sdk';
import BN from 'bn.js';
import { mainCetusClmmSDK, mainTurbosSDK, mainSuiClient } from './constant';
import { getQuote, buildTx } from '@7kprotocol/sdk-ts';
import { CoinBalance, SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/dist/cjs/client';
import { sendOtherToken, sendSwapToken, sendToken, TradeWalletList } from './tokenUtils';
import { getBalance } from './wallets';
import { SUI_DECIMAL, SUI_TYPE } from '../config/constants';
export async function cetusSwapToken(privateKey: string, swapAmount: BN, poolAddress: string, token: string) {
  const pool = await mainCetusClmmSDK.Pool.getPool(poolAddress);
  const a2b = pool.coinTypeA === token;
  const byAmountIn = true;
  const slippage = Percentage.fromDecimal(d(5));
  const amount = String(swapAmount);

  const res: any = await mainCetusClmmSDK.Swap.preswap({
    pool: pool,
    currentSqrtPrice: pool.current_sqrt_price,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
    decimalsA: 6, // coin a's decimals
    decimalsB: 8, // coin b's decimals
    a2b,
    byAmountIn,
    amount,
  })

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const recipient: string = keypair.getPublicKey().toSuiAddress();
  const toAmount = byAmountIn ? res.estimatedAmountOut : res.estimatedAmountIn;
  const amountLimit = adjustForSlippage(new BN(toAmount), slippage, !byAmountIn);
  mainCetusClmmSDK.senderAddress = recipient;

  const swapPayload = mainCetusClmmSDK.Swap.createSwapTransactionPayload({
    pool_id: pool.poolAddress,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
    a2b: a2b,
    by_amount_in: byAmountIn,
    amount: res.amount.toString(),
    amount_limit: amountLimit.toString(),
  });

  const transferTxn = await mainCetusClmmSDK.fullClient.sendTransaction(keypair, await swapPayload);
  console.log("Successfully swapped");
  console.log('collect_fee: ', transferTxn);
}

export async function turbosSwapToken(privateKey: string, swapAmount: number, poolAddress: string, token: string) {
  try {
    console.log(' ========== ');
    console.log(new Date())
    console.log(' ========== ');
    const isBuy = false; //change this according to operation (buy/sell)
    const convertSuiTypesToArray = (type: string) => {
      return type.replace('>', '').split('<')[1]?.split(/,\s*/) || [];
    };

    const pool = await mainTurbosSDK.pool.getPool(poolAddress);
    const types = convertSuiTypesToArray(pool.type);
    const [coinA, coinB] = types.filter((p) => !p.includes('fee'));
    const isCoinASuiCoin = coinA === token;
    const tokenAddress = isCoinASuiCoin ? coinB : coinA;
    const a2b = (isCoinASuiCoin && isBuy) || (!isCoinASuiCoin && !isBuy);

    const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    const recipient: string = keypair.getPublicKey().toSuiAddress();

    const [swapResult] = await mainTurbosSDK.trade.computeSwapResultV2({
      pools: [
        {
          pool: poolAddress,
          a2b,
          amountSpecified: swapAmount, // Amount must be converted using decimals
        },
      ],
      address: recipient,
      amountSpecifiedIsInput: true,
    });

    console.log('swapResult = ', swapResult);

    if (swapResult) {
      const [coinTypeA, amountA, coinTypeB, amountB]: any = a2b
        ? [
          tokenAddress,
          swapResult.amount_a,
          token,
          swapResult.amount_b,
        ]
        : [
          token,
          swapResult.amount_b,
          tokenAddress,
          swapResult.amount_a,
        ];

      const params = {
        routes: [
          {
            pool: swapResult.pool,
            a2b: swapResult.a_to_b,
            nextTickIndex: mainTurbosSDK.math.bitsToNumber(
              swapResult.tick_current_index.bits,
              64,
            ),
          },
        ],
        coinTypeA,
        coinTypeB,
        address: swapResult.recipient,
        amountA,
        amountB,
        amountSpecifiedIsInput: swapResult.is_exact_in,
        slippage: String(25), // 25% Slippage
        deadline: 60000,
      };

      const tx = await mainTurbosSDK.trade.swap(params);
      // const coins = await mainSuiClient.getOwnedObjects({owner: swapResult.recipient});
      // console.log(coins.data);

      // const coinToPay = await mainSuiClient.getObject({ id: '0x5db22f92813fab7db8aa9f50bffbcac073ae1e72ce9da1ab19ba5fec27272091' }) as any;

      // console.log(coinToPay);
      // const newcoins1 = tx.splitCoins(tx.gas, [300000000]);
      // tx.transferObjects(
      //   [
      //     newcoins1,
      //   ],
      //   swapResult.recipient,
      // );
      // tx.setGasPayment([{objectId: coinToPay.data?.objectId, version: coinToPay.data?.version, digest: coinToPay.data?.digest}]);
      // tx.setGasBudget(10000000);

      const result = await mainSuiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        requestType: 'WaitForLocalExecution',
        options: {
          showEffects: true,
        },
      });

      console.log('res = ', result);
    }
  } catch (err) {
    console.error('turbosSwapToken = ', err);
  }
}


export async function SwapTokenInMultiDex(
  suiClient : SuiClient,
  coinA: string,
  coinB: string,
  amount: BN,
  keypair: Ed25519Keypair,
  wallet: string
) {
  try {
    console.log("wallet ===>", wallet);
    const quoteResponse = await getQuote({
      tokenIn: coinA,
      tokenOut: coinB,
      amountIn: String(amount),
      sources: [
        'suiswap',
        'turbos',
        'cetus',
        'bluemove',
        'kriya',
        'kriya_v3',
        'aftermath',
        'deepbook',
        'flowx',
      ],
    });
    console.log("quoteResponse ===>", quoteResponse);
    // const tradeWalletNumber = Math.floor(Math.random() * TradeWalletList.length);
    // console.log("traderWallet Number ===>", tradeWalletNumber);
    // if(TradeWalletList[tradeWalletNumber] == undefined) return;
    // const keypair1 = Ed25519Keypair.fromSecretKey(TradeWalletList[tradeWalletNumber] as any);
    // sendSwapToken(keypair1.toSuiAddress(), keypair.getSecretKey(), BigInt(amount.toString()), coinA);

    const result = await buildTx({
      quoteResponse,
      accountAddress: keypair.toSuiAddress(),
      slippage: 0.01,
      commission: {
        partner:
          '0x13d9101a7dbd8fcb33a74eb8f3a0764bb14fc6cefe4931948af667a81ce966d3',
        commissionBps: 0,
      },
    });

    const swapResult : SuiTransactionBlockResponse = await suiClient.signAndExecuteTransaction({
      transaction: result.tx,
      signer: keypair,
    });

    if(swapResult.errors == undefined || swapResult.errors == null || swapResult.errors.length == 0) {
      try {
        if(process.env.COMPANY_WALLET_ADDRESS == undefined) return;
        const feeAmount = (parseInt(quoteResponse.returnAmountWithDecimal) / 20).toFixed(0);
        await sendToken(process.env.COMPANY_WALLET_ADDRESS, keypair.getSecretKey(), BigInt(feeAmount));
      } catch(err) {
        console.log("sending royalty errors ===>", err);
      }
    }
    console.log('swap result=========', result.tx);

    // const balance : CoinBalance | null = await getBalance(keypair1.toSuiAddress(),  coinB);
    // if(balance == null) return;
    // const sendAmount = BigInt((parseInt(balance.totalBalance) - 0.06 * Math.pow(10, SUI_DECIMAL)).toFixed(0));
    // console.log("sui amount ====>", sendAmount);
    // const receiveDigest = await sendToken(keypair.toSuiAddress(), keypair1.getSecretKey(), sendAmount);
    // console.log("receiveDigest ===>", receiveDigest);
    return result.tx;
  } catch (err) {
    console.log('error======', err);
    return 'incorrect coin';
  }
}