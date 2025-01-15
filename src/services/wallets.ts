import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const rpcUrl = getFullnodeUrl("mainnet");
// const rpcUrl = getFullnodeUrl("testnet");

export const suiClient = new SuiClient({ url: rpcUrl })

export interface NewWallet {
    address: string,
    publicKey : string,
    privateKey : string,
}

export const createNewSuiWallet = () => {
    const keyPair = Ed25519Keypair.generate();

    const pub_Key = keyPair.getPublicKey();

    const privateKey = keyPair.getSecretKey();
    const publicKey = pub_Key.toBase64();
    const suiAddress = pub_Key.toSuiAddress();

    return {
        address: suiAddress,
        publicKey,
        privateKey,
    };
}

export const getBalance = async (walletAddress: string, coinType?: string) => {
    try {
        const coins = await suiClient.getBalance({
            owner: walletAddress,
            coinType: coinType,
        });
        return coins;
    } catch (err) {
        console.error(err);
        return null;
    }
}

export const getAllBalances = async (walletAddress: string) => {
    try {
        //0xf16d99da1e218e6bd53f7de4d06aa5f40f7cd454c29b0f2655293d28b8163c77
        //0xaf6dabcd94a9d000bdfe061c2f2d2cf155c2b7ffc1924e214a2c50d5ac268253
        const coins = await suiClient.getAllBalances({ owner: walletAddress });
        return coins;
    } catch (err) {
        console.error(err);
        return null;
    }
}