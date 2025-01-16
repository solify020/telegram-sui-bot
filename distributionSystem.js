import { SuiClient } from "@mysten/sui/client";
import { SerialTransactionExecutor, Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

const mainSuiClient = new SuiClient({ url: 'https://orbital-tame-sound.sui-mainnet.quiknode.pro/bb567ac7dba1967c9c551314562aaa79e75b6437' })

const suiCoinType = "0x2::sui::SUI";

const sendToken = async(receiverAddress, privateKey, amount) => {
    try {
        const keypair = Ed25519Keypair.fromSecretKey(privateKey);
        const executor = new SerialTransactionExecutor({
            client: mainSuiClient,
            signer: keypair,
        });
        const tx1 = new Transaction();
        const [coin1] = tx1.splitCoins(tx1.gas, [amount]);
        tx1.transferObjects([coin1], receiverAddress);

        const [{ digest: digest1, data }] = await Promise.all([
            executor.executeTransaction(tx1),
        ]);

        console.log('sendToken = ', digest1);

        if (digest1 && (data.errors ?.length == 0 || data.errors == undefined)) {
            return digest1;
        } else {
            return null;
        }
    } catch (err) {
        console.error('sendToken = ', err);
        return false;
    }
}

const receiverAddresses = [
    "0xe4d1f04ca0877b287ee7f4cc842eb0931bdd4ffed2ac0981bc272a7b51ba5854",
    "0xe0fa0594afab6d5be4a0f5c8f5d32a95447945d273919851bbde89ab37ed5dc3",
    "0x7d36e089661fcec45e9395af3397b26fea9c856a67a4f5b965ebe6ba332e94a4",
    "0xcdfce34751b0bed476bee8c71da0ef40122a4ba2ddd78d765cd7f2966d014e3b",
    "0x606ba3899ddf5b335c2ec594a3114c4060f4ea4d8112fd900bbab699b86ff72e"
]

const fee_rates = [0.2, 0.2, 0.2, 0.3, 0.1]

const total_fee = async() => {
    const keypair = Ed25519Keypair.fromSecretKey(process.env.COMPANY_WALLET_PRIVATE);
    let balance = await mainSuiClient.getBalance({
        owner: keypair.toSuiAddress(),
        coinType: suiCoinType
    })

    const fee = balance.totalBalance - 5000000000;

    return fee;
}

const distribute = async() => {
    const balance = await total_fee();
    if (balance <= 0) return console.log('Not enough balance.');
    for (let i = 0; i < 5; i ++)
    {
        await sendToken(receiverAddresses[i], process.env.COMPANY_WALLET_PRIVATE, +(balance * fee_rates[i]).toFixed(0));
    }
}

distribute();

cron.schedule('0 */12 * * *', () => {
    distribute();
});