
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { adjustForSlippage, d, initCetusSDK, Percentage } from '@cetusprotocol/cetus-sui-clmm-sdk';
import BN from 'bn.js';
import { Network, TurbosSdk } from 'turbos-clmm-sdk';
import { EventId, getFullnodeUrl, SuiClient, SuiEventFilter } from '@mysten/sui/client';
import dotenv from 'dotenv';

import { mainSuiClient } from './constant';
import { checkPoolType } from './poolServices';
import { POLLING_INTERVAL_MS, MAX_EVENTS_PER_QUERY, SUI_DECIMAL, SUI_TYPE } from '../config/constants';
import { createNewSuiWallet, getAllBalances, getBalance } from '../services/wallets';
import { depositToTradingWallet, getDecimal, sendSwapToken, sendToken } from './tokenUtils';
import { turbosSwapToken, cetusSwapToken, SwapTokenInMultiDex } from './swapToken';
import { getTasks, updateTask } from './users';

type CetusSwapEvent = {
    atob: boolean;
    pool: string;
    amount_in: string;
    amount_out: string;
};

type TurbosSwapEvent = {
    a_to_b: boolean;
    pool: string;
    amount_a: string;
    amount_b: string;
};

type BlueSwapEvent = {
    amount_x_in : string,
    amount_x_out : string,
    amount_y_in : string,
    amount_y_out : string,
    pool_id : string,
    token_x_in : string,
    token_x_out : string,
    token_y_in : string,
    token_y_out : string,
    user : string
}

dotenv.config();

const rpcUrl = getFullnodeUrl("mainnet");
const cetusClmmSDK = initCetusSDK({ network: 'mainnet' });

const client = new SuiClient({ url: rpcUrl })

export const turbosSdk = new TurbosSdk(Network.mainnet);

export class TokenSwapManager {
    // Properties
    private privateKey: string;
    public runningState: boolean;
    private swapPercent: number;
    private minAmount: number;
    private tokenAType: string;
    private walletAddress: string;
    private isSwap: boolean = false;
    private oldTradeTX : any = {};
    private oldDigest : string = "";
    private cetusOldDigest : string = "";
    private turbosOldDigest : string = "";
    public userId : number = 0;
    public taskId : string = "";

    // Constructor
    constructor(userId : number, taskId : string, tokenType: string, privateKey: string, minAmount: number, swapPercent: number, walletAddress: string) {
        this.runningState = false;
        this.minAmount = minAmount;
        this.swapPercent = swapPercent;
        this.privateKey = privateKey;
        this.tokenAType = tokenType;
        this.walletAddress = walletAddress;
        this.oldDigest = "";
        this.turbosOldDigest = "";
        this.cetusOldDigest = "";
        this.userId = userId;
        this.taskId = taskId;
    }

    // Get Event Filter
    private getEventFilter(network : string, tokenInType : string) : SuiEventFilter {
        const blueEventFilter : SuiEventFilter = {
            MoveEventType : `${process.env.BLUEMOVE_PACKAGE_ID}::swap::Swap_Event<0x2::sui::SUI,${tokenInType}>`
        };
        const turbosEventFilter : SuiEventFilter = {
            MoveEventType : `${process.env.TURBOS_PACKAGE_ID}::pool::SwapEvent`
        };
        const cetusEventFilter : SuiEventFilter = {
            MoveEventType : `${process.env.CETUS_PACKAGE_ID}::pool::SwapEvent`
        }
        const totalEvenFilter : SuiEventFilter = {
            Any : [blueEventFilter, turbosEventFilter, cetusEventFilter]
        };
        // return totalEvenFilter;
        if(network == 'cetus') return cetusEventFilter;
        else if(network == 'turbos') return turbosEventFilter;
        return blueEventFilter;
    }

    // Start function
    public async start(): Promise<void> {
        if (this.runningState) {
            console.log("Already running.");
            return;
        }
        const task = await getTasks(this.userId, this.taskId);
        this.swapPercent = task.percent;
        this.minAmount = task.minAmount;
        this.runningState = true;
        console.log("Started the token swap manager.");
        this.runProcess();
    }

    // Stop function
    public stop(): void {
        if (!this.runningState) {
            console.log("Already stopped.");
            return;
        }
        this.runningState = false;

        console.log("Stopped the token swap manager.");
    }

    private async trackDex(dex : string) : Promise<any> {
        while (this.runningState) {
                await this.monitorSpecificTokenSwapEvents(
                    mainSuiClient,
                    this.tokenAType,
                    this.minAmount,
                    dex
                );
        }
    }

    // Process execution (placeholder)
    private async runProcess(): Promise<void> {
        this.trackDex('cetus');
        this.trackDex('turbos');
        this.trackDex('bluemove');
        // console.log("Process stopped.");
    }

    public async monitorSpecificTokenSwapEvents(
        client: SuiClient,
        tokenInType: string,
        amountThreshold: number,
        network: string,
        cursor: EventId | null = null
    ) {
        let eventString : string ;
        // console.log("blue move ===>", process.env.BLUEMOVE_PACKAGE_ID);
        // console.log("tokenInType ===>", tokenInType);
        // if(network !='bluemove') 
        //     eventString = network === 'cetus'
        //         ? `${process.env.CETUS_PACKAGE_ID}::pool::SwapEvent`
        //         : `${process.env.TURBOS_PACKAGE_ID}::pool::SwapEvent`;
        // else
        //     eventString = `${process.env.BLUEMOVE_PACKAGE_ID}::swap::Swap_Event<0x2::sui::SUI,${tokenInType}>`;

        // const nowDate = new Date();
        // console.log("nowData ===>", nowDate);
        // console.log("nowData ===>", nowDate.getMilliseconds())

        try {
            
            const { data, nextCursor } = await client.queryEvents({
                query: this.getEventFilter(network, tokenInType),
                cursor,
                order: 'descending',
                limit: 50,
            });
            // console.log("data ===>", data);
            console.log('Checking for recent swap events...');
            console.log('data length ===>', data.length);
            console.log("next cursor ===>", nextCursor);
            
            if(network == 'bluemove') {
                if(nextCursor?.txDigest == this.oldDigest)  return ;
                console.log("bluemove old digest ===>", this.oldDigest);
                const temp = this.oldDigest;
                this.oldDigest = nextCursor?.txDigest != undefined ? nextCursor.txDigest : "";
                if(temp == "") return ;
            } else if(network == 'cetus') {
                if(nextCursor?.txDigest == this.cetusOldDigest)  return ;
                console.log("cetus old digest ===>", this.cetusOldDigest);
                const temp = this.cetusOldDigest;
                this.cetusOldDigest = nextCursor?.txDigest != undefined ? nextCursor.txDigest : "";
                if(temp == "") return ;
            } else if(network == 'turbos') {
                if(nextCursor?.txDigest == this.turbosOldDigest)  return ;
                console.log("turbos old digest ===>", this.turbosOldDigest);
                const temp = this.turbosOldDigest;
                this.turbosOldDigest = nextCursor?.txDigest != undefined ? nextCursor.txDigest : "";
                if(temp == "") return ;
            }
            // return ;
            for (const event of data) {
                // console.log('event.parsedJson = ', event.parsedJson);

                const parsedJson = event.parsedJson as CetusSwapEvent | TurbosSwapEvent | BlueSwapEvent;
                let pool: string, isAToB: boolean, amountIn: string, amountOut: string;

                if ('amount_a' in parsedJson) {
                    // TurbosSwapEvent
                    // console.log("turbos ====>", parsedJson);
                    ({ pool, a_to_b: isAToB, amount_a: amountIn, amount_b: amountOut } = parsedJson);
                    isAToB = !isAToB;
                    // console.log("turbos pool ===>", pool);
                    if(pool == "0x4ddf1e46422069d37bebab516ebceab5ac5b3708ea6ecc37cf5e58f4d30c0fff") {
                        console.log("amount in ===>", amountIn);
                        console.log("amount out ===>", amountOut);
                    }
                    // turbosSwapToken(this.privateKey, Number(amountIn) , pool, this.tokenAType );

                } else if('amount_x_in' in parsedJson) {
                    const suiTokenString : string = "0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
                    if((parsedJson.amount_x_in == '0' && parsedJson.token_x_in == suiTokenString) || parsedJson.token_x_in != suiTokenString)   continue;
                    isAToB = false;
                    ({pool_id : pool, amount_x_in : amountIn, amount_y_out : amountOut} = parsedJson);
                    // console.log("pool ====>", pool);
                } else {
                    // CetusSwapEvent
                    // console.log("cetus ====>", event);
                    ({ pool, atob: isAToB, amount_in: amountIn, amount_out: amountOut } = parsedJson);
                    // console.log("cetus pool ====>", pool);
                    if(pool == "0xda1dbd8fca5f91438c006448fc86d463207b3f2721c2bdd0fd63b9ef3bf934d3")
                    {
                        console.log("amountIn ===>", amountIn);
                        console.log("amountOut ===>", amountOut);
                    }
                    // cetusSwapToken(this.privateKey, new BN(amountIn), pool, this.tokenAType)
                }

                // const { atob, pool, amount_in, amount_out } = event.parsedJson as {
                //     atob: boolean,
                //     pool: string,
                //     amount_in: string,
                //     amount_out: string,
                // };

                if (amountOut && (network=='bluemove' || await checkPoolType(pool, tokenInType, network))) {
                // if (isAToB && amountOut && await checkPoolType(pool, tokenInType, network)) {
                    const suiAmountIn = BigInt(amountIn);

                    if (suiAmountIn >= BigInt(amountThreshold * Math.pow(10, SUI_DECIMAL)) && isAToB == false) {
                        console.log('network = ', network);
                        console.log(`Amount sold = ${amountIn}`);
                        console.log(`Amount bought = ${amountOut}`);

                        const swapAmount = BigInt(amountOut) * BigInt(this.swapPercent) / BigInt(100);
                        const balances = await getBalance(this.walletAddress, this.tokenAType);
                        const taskInfo = await getTasks(this.userId, this.taskId);
                        const res = await depositToTradingWallet(taskInfo.tradingWallet.address, taskInfo.taskWallet.privateKey, tokenInType);

                        if (balances?.totalBalance) {
                            if (BigInt(balances?.totalBalance) > swapAmount) {

                                if (!this.isSwap && this.oldTradeTX[event.id.txDigest] != 1) {
                                    this.isSwap = true;
                                    console.log(`Sell in ${network}`);
                                    console.log("event digest ===>", event.id.txDigest);
                                    if(this.oldTradeTX[event.id.txDigest] == 1)  continue;

                                    console.log("old trade tx ===>", this.oldTradeTX[event.id.txDigest]);
                                    this.oldTradeTX[event.id.txDigest] = 1;

                                    const walletKeypair : Ed25519Keypair = Ed25519Keypair.fromSecretKey(this.privateKey);
                                    console.log("wallet ===>", walletKeypair.toSuiAddress());
                                    const response = await SwapTokenInMultiDex(client, tokenInType, '0x2::sui::SUI', new BN(swapAmount.toString()), walletKeypair, walletKeypair.toSuiAddress())
                                    

                                    let tradingWalletIndex = 0;
                                    for(let i = 0; i < taskInfo.tradingWalletList.length ; i ++) {
                                        if(taskInfo.tradingWalletList[i].privateKey == this.privateKey) {
                                            tradingWalletIndex = i;
                                            break;
                                        }
                                    }
                                    tradingWalletIndex = (tradingWalletIndex + 1) % 5;

                                    
                                    await depositToTradingWallet(taskInfo.tradingWalletList[tradingWalletIndex].address, taskInfo.tradingWallet.privateKey, tokenInType);
                                    const { data: coins } = await mainSuiClient.getCoins({
                                        owner : this.walletAddress,
                                        coinType : tokenInType
                                    });
                                    console.log("coins ===>", coins);
                                    if((coins[0] as any).balance == 0) {
                                        this.privateKey = taskInfo.tradingWalletList[tradingWalletIndex].privateKey;
                                        this.walletAddress = taskInfo.tradingWalletList[tradingWalletIndex].address;
                                        await updateTask(this.userId, this.taskId, 'tradingWallet', taskInfo.tradingWalletList[tradingWalletIndex]);
                                    }
                                    // if (network === 'cetus') {
                                    //     console.log('Sell in Cetus');
                                    //     await this.swapToken(this.privateKey, swapAmount, pool, this.tokenAType);
                                    // } else if (network === 'turbos') {
                                    //     console.log('Sell in Turbos');
                                    //     console.log(this.privateKey, Number(swapAmount), pool, this.tokenAType);
                                    //     // await turbosSwapToken(this.privateKey, Number(swapAmount), pool, this.tokenAType);
                                    //     const walletKeypair : Ed25519Keypair = Ed25519Keypair.fromSecretKey(this.privateKey);
                                    //     console.log("wallet ===>", walletKeypair.toSuiAddress());
                                    //     const response = await bluemoveSwapToken(client, tokenInType, '0x2::sui::SUI', new BN(swapAmount.toString()), walletKeypair, walletKeypair.toSuiAddress());
                                    //     console.log("turbos swap ===>", response);

                                    //     // this.stop();
                                    // } else if (network === 'bluemove') {
                                    //     console.log('Sell in Bluemove');
                                    //     const walletKeypair : Ed25519Keypair = Ed25519Keypair.fromSecretKey(this.privateKey);
                                    //     console.log("wallet ===>", walletKeypair.toSuiAddress());
                                    //     const response = await bluemoveSwapToken(client, tokenInType, '0x2::sui::SUI', new BN(swapAmount.toString()), walletKeypair, walletKeypair.toSuiAddress())
                                    //     console.log("blue move dex swap response ====>", response);
                                    // } else {
                                    //     this.stop();
                                    // }
                                    this.isSwap = false;
                                }
                            } else {
                                console.log(' ========= Balance is not enough ========== ');
                                console.log('Your balance = ', balances?.totalBalance);
                                console.log('swapAmount = ', swapAmount);
                                // this.stop();
                            }
                        } else {
                            console.log('Your balance is 0');
                            this.stop();
                        }
                        break;
                    }
                }
            }

            cursor = data[0]?.id ?? cursor;
        } catch (error) {
            console.error('Error fetching Cetus swap events:', error);
            this.runningState = false;
        } finally {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
        }
    }

    public async swapToken(privateKey: string, swapAmount: BigInt, poolAddress: string, tokenAType: string) {
        const pool = await cetusClmmSDK.Pool.getPool(poolAddress);
        const a2b = pool.coinTypeA === tokenAType;
        const byAmountIn = true;
        const slippage = Percentage.fromDecimal(d(5));
        const amount = String(swapAmount);

        const coinADecimal = getDecimal(pool.coinTypeA);
        const coinBDecimal = getDecimal(pool.coinTypeB);

        const res: any = await cetusClmmSDK.Swap.preswap({
            pool: pool,
            currentSqrtPrice: pool.current_sqrt_price,
            coinTypeA: pool.coinTypeA,
            coinTypeB: pool.coinTypeB,
            decimalsA: Number(coinADecimal),
            decimalsB: Number(coinBDecimal),
            a2b,
            byAmountIn,
            amount,
        })

        const keypair = Ed25519Keypair.fromSecretKey(privateKey);
        const recipient: string = keypair.getPublicKey().toSuiAddress();
        const toAmount = byAmountIn ? res.estimatedAmountOut : res.estimatedAmountIn;
        const amountLimit = adjustForSlippage(new BN(toAmount), slippage, !byAmountIn);

        cetusClmmSDK.senderAddress = recipient;

        const swapPayload = cetusClmmSDK.Swap.createSwapTransactionPayload({
            pool_id: pool.poolAddress,
            coinTypeA: pool.coinTypeA,
            coinTypeB: pool.coinTypeB,
            a2b: a2b,
            by_amount_in: byAmountIn,
            amount: res.amount.toString(),
            amount_limit: amountLimit.toString(),
        });

        const transferTxn = await cetusClmmSDK.fullClient.sendTransaction(keypair, await swapPayload);
        console.log("Successfully swapped");
        console.log('collect_fee: ', transferTxn);
    }
}