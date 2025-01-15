import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk'
import { CoinBalance, CoinMetadata, SuiClient } from '@mysten/sui/client';
import { Network, TurbosSdk } from 'turbos-clmm-sdk';
import { MAINNET, SUI_DECIMAL, SUI_TYPE, TESTNET } from '../config/constants';
import TelegramBot from 'node-telegram-bot-api';
import { getTasks, getUserInfo } from './users';
import { getBalance } from './wallets';
import { botData } from '../bot';
export const mainCetusClmmSDK = initCetusSDK({network: 'mainnet'});
export const testCetusClmmSDK = initCetusSDK({network: 'testnet'});

export const mainSuiClient = new SuiClient({ url: MAINNET });
export const testSuiClient = new SuiClient({ url: TESTNET });

export const mainTurbosSDK = new TurbosSdk(Network.mainnet);
export const testTurbosSDK = new TurbosSdk(Network.testnet);

export enum BotStatusInterface {
    InputWithdrawAmount = "withdraw amount",
    InputWithdrawAddress = "withdraw address",
    InputContractAddress = "input new contract address",
    UpdateSellPercent = "Updating sell percent",
    UpdateMinAmount = "Updating mint amount",
    UpdateMarketCap = "Updating market cap",
    UpdateEveryBuy = "Updating every buy",
    ExtendRental = "Extending task rental",
    TaskWithDrawAddress = "Task withdraw address",
    TaskWithDrawAmount = "Task withdraw amount",
    RentUpdateSellPercent = "Rent Updating sell percent",
    RentUpdateMinAmount = "Rent Updating mint amount",
    RentUpdateMarketCap = "Rent Updating market cap",
    RentUpdateEveryBuy = "Rent Updating every buy",
}


export const isValidSuiAddress = (address : string) : boolean => {

    if(!address.startsWith('0x')) {
        return false;
    }

    if(address.length !== 66)
        return false;
    const hexRegex = /^[0-9a-fA-F]{64}$/;
    if (!hexRegex.test(address.slice(2))) {
        return false;
    }
    return true;
}

export const isValidWithdrawAmount = async (message : TelegramBot.Message, amount : string) : Promise<boolean> => {
    const userInfo = await getUserInfo(message.chat.id, message.chat.username);
    if(userInfo?.wallet?.address) {
        const balance : CoinBalance | null = await getBalance(userInfo?.wallet?.address, SUI_TYPE);
        if(balance == null) return false;
        console.log("balance ===>", balance, "amount ===>", amount);
        const calBal = parseFloat(balance.totalBalance)/Math.pow(10, SUI_DECIMAL);
        console.log("calBAl ===>", calBal);
        console.log("amount ===>", parseFloat(amount));
        if(parseFloat(amount) > calBal)   return false;
        if(parseFloat(amount) < 0.05 || Number.isNaN(parseFloat(amount)))   return false;

        return true;
    }

    return false;
}

export const isValidWithdrawTaskAmount = async (message : TelegramBot.Message, taskId : string, amount : string) : Promise<boolean> => {
    const userInfo = await getUserInfo(message.chat.id, message.chat.username);
    const task = await getTasks(message.chat.id, taskId);
    if(task.tradingWallet.address) {
        console.log("withdraw coin type ====>", botData.withDrawCoinType);
        if(botData.withDrawCoinType == 0) {
            const balance : CoinBalance | null = await getBalance(task.tradingWallet.address, SUI_TYPE);
            if(balance == null) return false;
            console.log("balance ===>", balance, "amount ===>", amount);
            const calBal = parseFloat(balance.totalBalance)/Math.pow(10, SUI_DECIMAL);
            console.log("calBAl ===>", calBal);
            if(parseFloat(amount) + 0.1 > calBal)   return false;
            if(parseFloat(amount) < 0.05 || Number.isNaN(parseFloat(amount)))   return false;
            return true;
        } else if(botData.withDrawCoinType == 1) {
            console.log("tokenAddress ===>", task.tokenAddress);
            const balance : CoinBalance | null = await getBalance(task.tradingWallet.address, task.tokenAddress);
            const coinInfo : CoinMetadata | null = await mainSuiClient.getCoinMetadata({coinType : task.tokenAddress});
            if(balance == null || coinInfo == null) return false;
            const calBal = parseFloat(balance.totalBalance) / Math.pow(10, coinInfo.decimals);
            console.log("calBal ===>", calBal);
            if(parseFloat(amount) > calBal) return false;
            if(Number.isNaN(parseFloat(amount)))    return false;
            return true;
        }
    }

    return false;
}

export const isValidSuiCoinType = async (message : TelegramBot.Message) : Promise<boolean> => {
    console.log(message.text);
    if(message.text?.startsWith('0x')) {
        const splitData : Array<string> = message.text.split('::');
        if(splitData.length == 3) {
            try {
                const coinInfo = await mainSuiClient.getCoinMetadata( { coinType : message.text} );
                console.log("coinInfo ====>", coinInfo);
                if(coinInfo == null) return false;
            } catch(err) {
                return false;
            }
            return true;
        }
    }
    return false;
}