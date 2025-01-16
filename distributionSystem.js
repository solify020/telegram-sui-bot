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
    "0x0eb63d0bb3903b096ad87acf29758645df8e7a39f7af2038bbf751880a7559c7",
    "0xce3302009b26d702e4c000e71b123d621da941a237ab3cca8b183bb2753fa803",
    "0x06e39f3b8b8cdd393de94526ce33836627d01eb4b4618bd06060d4e6f1c92d1b",
    "0x750d648c5a4fd1af8d650cee963645a47a9200b1b5043a2a34fe103378efcfa1",
    "0xdd7b1f0d8bf757f4e762912a8608a35e5e62c14a20027c64b4dfd78ac81b175d"
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