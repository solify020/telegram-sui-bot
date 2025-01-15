import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SerialTransactionExecutor, Transaction } from '@mysten/sui/transactions';
import { mainSuiClient } from './constant';
import { SUI_DECIMAL, SUI_TYPE } from '../config/constants';
import { CoinBalance } from '@mysten/sui/dist/cjs/client';

export const TradeWalletList : Array<string> = [
    "suiprivkey1qphq8jcvtq8dxwuxnaghw5le8lr7g3wk82cw8q75p6zm4c7n2460v0se80g",
    "suiprivkey1qpcyaw0h8f3tmycq7nvxtawzsy9drq40xs89h4423u02hz6pd4r8gkzczu2"
];

export async function sendToken(receiverAddress: string, privateKey:string, amount:bigint) {
    try {
        const keypair = Ed25519Keypair.fromSecretKey(privateKey);
        const executor = new SerialTransactionExecutor({
        client: mainSuiClient,
        signer: keypair,
        });

        // const { data: coins } = await mainSuiClient.getCoins({
        //     owner : "0xfd7adc82ed6a8a824b1c03724ce059e3178cf4ddf067680668b07c11e121ed6f",
        //     coinType : "0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD"
        // });

        // console.log("coins ===>", coins);
        // if(coins[0]?.coinObjectId == undefined)   return;
        // const tx = new Transaction();
        // const [coin] = tx.splitCoins(coins[0]?.coinObjectId, [BigInt(1000000)]);
        // if(coin == undefined)   return;
        // tx.transferObjects([coin], receiverAddress);

        const tx1 = new Transaction();
        const [coin1] = tx1.splitCoins(tx1.gas, [amount]) as any;
        tx1.transferObjects([coin1], receiverAddress);

        const [{ digest: digest1, data }] = await Promise.all([
            executor.executeTransaction(tx1),
        ]);

        console.log('sendToken = ', digest1 );

        if(digest1 && (data.errors?.length == 0 || data.errors == undefined)) {
            return digest1;
        } else {
            return null;
        }
    } catch (err) {
        console.error('sendToken = ', err);
        return false;
    }
}

export async function sendOtherToken(receiverAddress: string, privateKey:string, coinType : string) {
    try {
        const keypair = Ed25519Keypair.fromSecretKey(privateKey);
        const executor = new SerialTransactionExecutor({
        client: mainSuiClient,
        signer: keypair,
        });

        const { data: coins } = await mainSuiClient.getCoins({
            owner : keypair.toSuiAddress(),
            coinType : coinType
        });
        console.log("coins ===>", coins);
        const coinBalance : CoinBalance = await mainSuiClient.getBalance({coinType, owner : keypair.toSuiAddress()});

        // console.log("coins ===>", coins);
        console.log("coinbalance ===>", coinBalance);
        if(coins == undefined)   return;
        const tx = new Transaction();
        const coinsToTransfer : any = [];
        for(let i = 0; i < coins.length ; i++) {
            if((coins[i] as any).balance == '0') continue;
            const [coin] = tx.splitCoins((coins[i] as any).coinObjectId, [(coins[i] as any).balance]);
            coinsToTransfer.push(coin);
        }
        tx.transferObjects(coinsToTransfer, receiverAddress);


        const [{ digest: digest1 }] = await Promise.all([
            executor.executeTransaction(tx),
        ]);

        console.log('sendOtherToken = ', digest1 );

        if(digest1) {
            return digest1;
        } else {
            return false;
        }
    } catch (err) {
        console.error('sendToken = ', err);
        return false;
    }
}

export async function sendSwapToken(receiverAddress: string, privateKey:string, coinType : string) {
    try {
        const keypair = Ed25519Keypair.fromSecretKey(privateKey);
        const executor = new SerialTransactionExecutor({
        client: mainSuiClient,
        signer: keypair,
        });

        const { data: coins } = await mainSuiClient.getCoins({
            owner : keypair.toSuiAddress(),
            coinType : coinType
        });
        // console.log("coins ===>", coins);
        const coinBalance : CoinBalance = await mainSuiClient.getBalance({coinType, owner : keypair.toSuiAddress()});

        // console.log("coins ===>", coins);
        console.log("coinbalance ===>", coinBalance);
        if(coins == undefined)   return;
        const tx = new Transaction();
        const coinsToTransfer : any = [];
        for(let i = 0; i < coins.length ; i++) {
            if((coins[i] as any).balance != '0') {
                const [coin] = tx.splitCoins((coins[i] as any).coinObjectId, [(coins[i] as any).balance]);
                coinsToTransfer.push(coin);
            }
        }
        tx.transferObjects(coinsToTransfer, receiverAddress);

        // const suiBalance : CoinBalance = await mainSuiClient.getBalance({coinType, owner : keypair.toSuiAddress()});

        // const tx1 = new Transaction();
        // const [coin1] = tx1.splitCoins(tx1.gas, [parseInt(suiBalance.totalBalance) - 0.06 * Math.pow(10, SUI_DECIMAL)]) as any;
        // tx1.transferObjects([coin1], receiverAddress);

        const [{ digest: digest1 }] = await Promise.all([
            executor.executeTransaction(tx),
            // executor.executeTransaction(tx1),
        ]);

        console.log('sendSwapToken = ', digest1 );

        if(digest1) {
            return digest1;
        } else {
            return false;
        }
    } catch (err) {
        console.error('sendToken = ', err);
        return false;
    }
}

interface IReceivers {
    receiver: string,
    amount: bigint
}

export async function sendMultiToken(receivers: IReceivers[], privateKey:string) {
    try {
        const keypair = Ed25519Keypair.fromSecretKey(privateKey);
        const executor = new SerialTransactionExecutor({
        client: mainSuiClient,
        signer: keypair,
        });

        const tx1 = new Transaction();

        console.log('receivers = ', receivers);
        receivers.filter(r => r).map((r) => {
            console.log(r);
            if (r.receiver) {
                const [coin1] = tx1.splitCoins(tx1.gas, [r.amount]) as any;
                tx1.transferObjects([coin1], r.receiver);
            }
        });

        const [{ digest: digest1 }] = await Promise.all([
            executor.executeTransaction(tx1),
        ]);

        console.log('sendMultiToken = ', digest1 );

        if(digest1) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.error('sendMultiToken = ', err);
        return false;
    }
}

export const getDecimal = async (tokenType: string) => {
    try {
        const metaData = await mainSuiClient.getCoinMetadata({ coinType: tokenType });

        if (metaData) {
            console.log(`Token Decimals: ${metaData.decimals}`);
            return metaData.decimals;
        } else {
            console.log('Metadata not found for the given token type.');
            return null;
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}

// const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    // const txb = new Transaction();
    // txb.setSender(keypair.getPublicKey().toSuiAddress());
    // txb.setGasPrice(5);
    // txb.setGasBudget(100);

    // const bytes = await txb.build();
    // const serializedSignature = (await keypair.signTransaction(bytes)).signature;

    // let res = client.executeTransactionBlock({
    //     transactionBlock: bytes,
    //     signature: serializedSignature,
    // });
    // console.log(res);

    // const tx = new Transaction();
    // const keypair = Ed25519Keypair.fromSecretKey(privateKey);

    // const coins = await mainSuiClient.getCoins({owner: keypair.getPublicKey().toSuiAddress(), coinType: tokenType});

    // if (coins.data.length === 0 || !coins.data[0]) {
    //     console.log("No coins found in the wallet.");
    //     return;
    // }

    // if(amount > BigInt(coins.data[0].balance)){
    //     console.log("There is insufficient amount");
        
    //     return false;
    // } else{
    //     const [coin] = tx.splitCoins(coins.data[0].coinObjectId, [amount]); 

    //     const coinToPay = await mainSuiClient.getObject({ id: '0x5db22f92813fab7db8aa9f50bffbcac073ae1e72ce9da1ab19ba5fec27272091' }) as any;

    //           tx.setGasPayment([{objectId: coinToPay.data?.objectId, version: coinToPay.data?.version, digest: coinToPay.data?.digest}]);
    //   tx.setGasBudget(10000000);
        
    //     if (coin) {


    //         const result = await mainSuiClient.signAndExecuteTransaction({signer: keypair, transaction: tx});
    //         console.log('result = ', result)

    //         await mainSuiClient.waitForTransaction({digest: result.digest});
        
    //         console.log("Transaction successful. Digest:", result.digest);

    //         return true;
    //     }
    // }

    // return true;

export const depositToTradingWallet = async (receiver : string, senderPrivateKey : string, tokenInType : string ) : Promise<Boolean> => {
    try {
        const walletKeypair : Ed25519Keypair = Ed25519Keypair.fromSecretKey(senderPrivateKey);
        const response1 = await sendSwapToken(receiver, senderPrivateKey, tokenInType);
        const coinBalance = await mainSuiClient.getBalance({coinType : SUI_TYPE, owner : walletKeypair.toSuiAddress()});
        const sendAmount = BigInt(coinBalance.totalBalance) - BigInt(0.08 * Math.pow(10, SUI_DECIMAL));
        console.log("sendAmount ===>", sendAmount);
        const response2 = await sendToken(receiver, senderPrivateKey, sendAmount);
        console.log('swap response ===>', response1, response2);
    } catch(err) {
        return false;
    }
    return true;
}