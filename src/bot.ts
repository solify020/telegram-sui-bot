import TelegramBot from 'node-telegram-bot-api';

import 'dotenv/config';
import * as process from 'process';
import * as SuibotUI from './callbackquery_fuctions/suibot';
import * as ProfitUI from './callbackquery_fuctions/profitbot';
import { BOT_DEFAULT_NAME, MIN_AMOUNT, SUI_DECIMAL, SUI_TYPE, SWAP_PERCENT, TOKEN_ADDRESS } from './config/constants';
import { addNewtask, getTasks, updateTask, deleteTasks, updateRefferal } from './services/users';
import { getPools, getPoolsInfo } from './services/pools';
import { TokenSwapManager } from './services/tokenSwapper';
import { getUserInfo } from './services/users';
import { getBalance } from './services/wallets';
import { processMembership } from './services/membership';
import { BotStatusInterface, isValidSuiAddress, isValidSuiCoinType, isValidWithdrawAmount, isValidWithdrawTaskAmount, mainSuiClient } from './services/constant';
import { sendSwapToken, sendToken } from './services/tokenUtils';

const token = process.env.TELEGRAM_BOT_TOKEN;
console.log('token = ', token);

if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN environment variable is not defined");
}

export const bot = new TelegramBot(token, { polling: true });

export const botStatus = {
    updatePercent: {},
    updateMinAmount: {},
    taskName: {},
    tokenAddress: {},
    taskUpdate: {},
    referral: {},
    otherStatus : {},
    rentStatus : {},
    rent1Status : {},
    txStatus : {},
    advancedStatus : {},
} as any;
export const botData = {
    updatePercent: {},
    updateMinAmount: {},
    taskName: {},
    tokenAddress: {},
    taskUpdateId: {},
    referral: {},
    withDrawAmount : {},
    withDrawAddress : {},
    withDrawTaskAmount : {},
    withDrawTaskAddress : {},
    withDrawCoinType : {},
    membershipLevel : {},
    updateTaskId : {},
    rentPercent : {},
    rentBuyTransaction : {},
    rentMinAmount : {},
    rentMC : {},
    rentTokenAddress : {},
    rent1Percent : {},
    rent1BuyTransaction : {},
    rent1MinAmount : {},
    rent1MC : {},
    rent1TokenAddress : {},
    progressRentingProjectIndex : {},
} as any;

const initializeState = (chatId: number) => {
    delete botStatus.updatePercent[chatId];
    delete botStatus.updateMinAmount[chatId];
    delete botStatus.taskName[chatId];
    delete botStatus.tokenAddress[chatId];
    delete botStatus.taskUpdate[chatId];
    delete botStatus.referral[chatId];
}
export const tokenSwapManager = {} as any;

export const processBot = () => {
    try {
        bot.setMyCommands([
            {command : '/start', description : 'Home'},
            {command : '/projects', description : 'My projects'},
            {command : '/smart_profit', description : 'Smart Profit'},
            {command : '/wallet', description : 'My wallet'},
            {command : '/help', description : 'Help'}
        ])

        bot.onText(/\/start(.*)/, async (msg, match) => {
            console.log(msg);
            // const receiver = "0xfbb5796afa686918bcbcb2b38041913b736d4a50556f39e81cc2ceac80dd7e7a";
            // const prvKey = "suiprivkey1qqxgsvhswp4gvpfyt4hnr7wrhgup728ure09pa2ffzt3ku06vf9msauur86";
            // const tokenType = "0x5701b78aa77d856c4ed2656984b8543517a27b1bf337ea42e462846df2f131bb::milk::MILK";
            // const response = await sendSwapToken(receiver, prvKey, tokenType);
            // console.log("response ===>", response);
            // '0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD'
            // const response = await sendSwapToken('0xfd7adc82ed6a8a824b1c03724ce059e3178cf4ddf067680668b07c11e121ed6f', 'suiprivkey1qqlch84h7605m6zkvzn2y8tyj7zndrtch6hxghge3xzpzve5ankpyn78y8y', '0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD');
            // const coinBalance = await mainSuiClient.getBalance({coinType : SUI_TYPE, owner : '0xdf94733f2f6f84e0f9efc3fd202be4f073d46fb79e098af23e8de16793d9b2d4'});
            // const sendAmount = BigInt(coinBalance.totalBalance) - BigInt(0.07 * Math.pow(10, SUI_DECIMAL));
            // console.log("sendAmount ===>", sendAmount);
            // const response1 = await sendToken('0xfd7adc82ed6a8a824b1c03724ce059e3178cf4ddf067680668b07c11e121ed6f','suiprivkey1qqlch84h7605m6zkvzn2y8tyj7zndrtch6hxghge3xzpzve5ankpyn78y8y', sendAmount);
            // console.log('swap response ===>', response, response1);

            initializeState(msg.chat.id);
            const userInfo = await getUserInfo(msg.chat.id, msg.chat.username);

            if (!match && !userInfo.referral?.parent1) {
                botStatus.referral[msg.chat.id] = true;
                SuibotUI.refferalInputUI(msg);
                return;
            } else if (match && match[1]) {
                const referrerId = match[1].trim();

                if (referrerId) {
                    const result = await updateRefferal(msg.chat.id, Number(referrerId));
                    if (result) {
                        bot.sendMessage(referrerId, `🎉 You referred a new user!`);
                    } else {
                        botStatus.referral[msg.chat.id] = true;
                        SuibotUI.refferalInputUI(msg);
                        return;
                    }
                } else {
                    SuibotUI.refferalInputUI(msg);
                    return;
                }
            }
            SuibotUI.mainUI(msg, false);
        });

        bot.onText(/\/smart_profit/, async (msg) => {
            ProfitUI.profitMainUI(msg);
        });

        bot.onText(/\/referrals/, async (msg) => {
            SuibotUI.refferalUI(msg);
        });

        bot.onText(/\/help/, async (msg) => {
            SuibotUI.helpUI(msg);
        });

        bot.onText(/\/wallet/, async (msg) => {
            ProfitUI.showPrivateKey(msg);
        });

        bot.onText(/\/projects/, async (msg) => {
            ProfitUI.projectListMainUI(msg, false);
        });

        bot.on('message', async (message) => {
            const chatId = message.chat.id;
            if (message.text && !message.text.startsWith('/')) {
                console.log('botStatus.taskName[chatId] = ', botStatus.taskName[chatId])
                if (botStatus.updatePercent[chatId]) {
                    if (Number(message.text) && Number(message.text) > 0) {
                        if (botStatus.taskUpdate[chatId]) {
                            await updateTask(chatId, botData.taskUpdateId[chatId], 'percent', Number(message.text));
                            ProfitUI.projectDetailUI(message, botData.taskUpdateId[chatId], false);
                        } else {
                            botData.updatePercent[chatId] = Number(message.text);
                            ProfitUI.newProjectUI(message, botData, false);
                        }
                        botStatus.updatePercent[chatId] = false;
                    } else {
                        ProfitUI.InputValueUI(message, 'Please input correct value.', false);
                    }
                }

                if (botStatus.updateMinAmount[chatId]) {
                    if (Number(message.text) && Number(message.text) > 0) {
                        if (botStatus.taskUpdate[chatId]) {
                            await updateTask(chatId, botData.taskUpdateId[chatId], 'minAmount', Number(message.text));
                            ProfitUI.projectDetailUI(message, botData.taskUpdateId[chatId], false);
                        } else {
                            botData.updateMinAmount[chatId] = Number(message.text);
                            ProfitUI.newProjectUI(message, botData, false);
                        }
                        botStatus.updateMinAmount[chatId] = false;
                    } else {
                        ProfitUI.InputValueUI(message, 'Please input correct value.', false);
                    }
                }

                if (botStatus.taskName[chatId]) {
                    if (botStatus.taskUpdate[chatId]) {
                        await updateTask(chatId, botData.taskUpdateId[chatId], 'name', message.text);
                        ProfitUI.projectDetailUI(message, botData.taskUpdateId[chatId], false);
                    } else {
                        botData.taskName[chatId] = message.text;
                        ProfitUI.newProjectUI(message, botData, false);
                    }
                    botStatus.taskName[chatId] = false;
                }

                if (botStatus.tokenAddress[chatId]) {
                    if (message.text.startsWith("0x")) {
                        if (botStatus.taskUpdate[chatId]) {
                            await updateTask(chatId, botData.taskUpdateId[chatId], 'tokenAddress', message.text);

                            const userInfo = await getUserInfo(chatId);

                            const task = await getTasks(chatId, botData.taskUpdateId[chatId]);
                            const poolData = await getPoolsInfo(task.tokenAddress) as any;

                            if (poolData) {
                                const { poolAddress, coinTypeA, coinTypeB } = poolData;

                                const tokenType = coinTypeA === '0x2::sui::SUI' ? coinTypeB : coinTypeA;

                                const walletAddress = userInfo?.wallet?.address as string;
                                const balance = await getBalance(walletAddress, tokenType);

                                ProfitUI.projectDetailUI(message, botData.taskUpdateId[chatId], false, poolAddress, balance ? balance?.totalBalance : '0');

                            } else {
                                ProfitUI.InputValueUI(message, 'This token Pool not exist.\nPlease input valid token address.', false);
                            }
                        } else {
                            botData.tokenAddress[chatId] = message.text;
                            const userInfo = await getUserInfo(chatId);
                            const poolData = await getPoolsInfo(message.text) as any;

                            if (poolData) {
                                const { poolAddress, coinTypeA, coinTypeB } = poolData;
                                const tokenType = coinTypeA === '0x2::sui::SUI' ? coinTypeB : coinTypeA;

                                const walletAddress = userInfo?.wallet?.address as string;
                                const balance = await getBalance(walletAddress, tokenType);
                                ProfitUI.newProjectUI(message, botData, false, poolAddress, balance ? balance?.totalBalance : '0');

                            } else {
                                ProfitUI.InputValueUI(message, 'This token Pool not exist.\nPlease input valid token address.', false);
                            }
                        }
                        botStatus.tokenAddress[chatId] = false;
                    } else {
                        ProfitUI.InputValueUI(message, 'Please input correct value.', false);
                    }
                }

                if (botStatus.referral[chatId]) {
                    const result = await updateRefferal(chatId, undefined, message.text);
                    if (result) {
                        SuibotUI.mainUI(message, false);
                        botStatus.referral[chatId] = false;
                    } else {
                        ProfitUI.InputValueUI(message, 'Please input valid username.', false);
                    }
                }

                if (botStatus.otherStatus[chatId] == BotStatusInterface.InputWithdrawAddress) {
                    if(!isValidSuiAddress(message.text)) { 
                        ProfitUI.InputSimpleUI(message, 'Please input correct value', false);
                        return ;
                    }
                    botData.withDrawAddress[chatId] = message.text;
                    botStatus.otherStatus[chatId] = undefined;
                    SuibotUI.confirmationMainUI(message);
                } else if (botStatus.otherStatus[chatId] == BotStatusInterface.InputWithdrawAmount) {
                    if(!(await isValidWithdrawAmount(message, message.text))) {
                        ProfitUI.InputSimpleUI(message, "Please, enter a valid amount", false);
                        return ;
                    }
                    botData.withDrawAmount[chatId] = message.text;
                    botStatus.otherStatus[chatId] = BotStatusInterface.InputWithdrawAddress;
                    SuibotUI.withdrawMainUI(message);
                } else if (botStatus.otherStatus[chatId] == BotStatusInterface.InputContractAddress) {
                    if(!(await isValidSuiCoinType(message))) {
                        ProfitUI.InputSimpleUI(message, "Please input correct coin type", false);
                        return ;
                    }
                    botStatus.otherStatus[chatId] = undefined;
                    ProfitUI.createTaskConfirmationUI(message);
                } else if(botStatus.otherStatus[chatId] == BotStatusInterface.UpdateSellPercent) {
                    const value = parseInt(message.text);
                    if(value <=0) {
                        ProfitUI.InputSimpleUI(message, "Please input correct value", false);
                        return ;
                    }
                    await updateTask(chatId, botData.updateTaskId[chatId], 'percent', value);
                    ProfitUI.profitTaskMainUI(message, botData.updateTaskId[chatId], false, botStatus.advancedStatus[message.chat.id]);
                } else if(botStatus.otherStatus[chatId] == BotStatusInterface.UpdateMinAmount) {
                    const value = parseFloat(message.text);
                    if(value <=0) {
                        ProfitUI.InputSimpleUI(message, "Please input correct value", false);
                        return ;
                    }
                    await updateTask(chatId, botData.updateTaskId[chatId], 'minAmount', value);
                    ProfitUI.profitTaskMainUI(message, botData.updateTaskId[chatId], false, botStatus.advancedStatus[message.chat.id]);
                } else if(botStatus.otherStatus[chatId] == BotStatusInterface.UpdateMarketCap) {
                    const value = message.text;
                    if(!value.endsWith('k') && !value.endsWith('K')) {
                        ProfitUI.InputSimpleUI(message, "Please input correct value", false, );
                        return ;
                    }
                    await updateTask(chatId, botData.updateTaskId[chatId], 'marketCap', value.toLowerCase());
                    ProfitUI.profitTaskMainUI(message, botData.updateTaskId[chatId], false, botStatus.advancedStatus[message.chat.id]);
                } else if(botStatus.otherStatus[chatId] == BotStatusInterface.UpdateEveryBuy) {
                    const value = parseInt(message.text);
                    if(value <= 0) {
                        ProfitUI.InputSimpleUI(message, "Please input correct value", false);
                        return ;
                    }
                    await updateTask(chatId, botData.updateTaskId[chatId], 'everyBuy', value);
                    ProfitUI.profitTaskMainUI(message, botData.updateTaskId[chatId], false, botStatus.advancedStatus[message.chat.id]);
                } else if (botStatus.otherStatus[chatId] == BotStatusInterface.TaskWithDrawAmount) {
                    if(!(await isValidWithdrawTaskAmount(message,botData.updateTaskId[message.chat.id] ,message.text))) {
                        ProfitUI.InputSimpleUI(message, "Please, enter a valid amount", false);
                        return ;
                    }
                    botData.withDrawTaskAmount[chatId] = message.text;
                    botStatus.otherStatus[chatId] = BotStatusInterface.TaskWithDrawAddress;
                    ProfitUI.taskWithdrawMainUI(message, false);
                }  else if(botStatus.otherStatus[chatId] == BotStatusInterface.RentUpdateSellPercent) {
                    const value = parseInt(message.text);
                    if(value <=0) {
                        ProfitUI.InputSimpleUI(message, "Please input correct value", false);
                        return ;
                    }
                    if(botData.progressRentingProjectIndex[chatId] == 0)
                        botData.rentPercent[chatId] = value;
                    else botData.rent1Percent[chatId] = value;
                    ProfitUI.rentalMainUI(message, false, botData.progressRentingProjectIndex[chatId]);
                } else if(botStatus.otherStatus[chatId] == BotStatusInterface.RentUpdateMinAmount) {
                    const value = parseFloat(message.text);
                    if(value <=0) {
                        ProfitUI.InputSimpleUI(message, "Please input correct value", false);
                        return ;
                    }
                    if(botData.progressRentingProjectIndex[chatId] == 0)
                        botData.rentMinAmount[chatId] = value;
                    else botData.rent1MinAmount[chatId] = value;
                    ProfitUI.rentalMainUI(message, false, botData.progressRentingProjectIndex[chatId]);
                } else if(botStatus.otherStatus[chatId] == BotStatusInterface.RentUpdateMarketCap) {
                    const value = message.text;
                    if(!value.endsWith('k') && !value.endsWith('K')) {
                        ProfitUI.InputSimpleUI(message, "Please input correct value", false);
                        return ;
                    }
                    if(botData.progressRentingProjectIndex[chatId] == 0)
                        botData.rentMC[chatId] = value;
                    else botData.rent1MC[chatId] = value;
                    ProfitUI.rentalMainUI(message, false, botData.progressRentingProjectIndex[chatId]);
                } else if(botStatus.otherStatus[chatId] == BotStatusInterface.RentUpdateEveryBuy) {
                    const value = parseInt(message.text);
                    if(value <= 0) {
                        ProfitUI.InputSimpleUI(message, "Please input correct value", false);
                        return ;
                    }
                    if(botData.progressRentingProjectIndex[chatId] == 0)
                        botData.rentBuyTransaction[chatId] = value;
                    else botData.rent1BuyTransaction[chatId] = value;
                    ProfitUI.rentalMainUI(message, false, botData.progressRentingProjectIndex[chatId]);
                } else if(botStatus.otherStatus[chatId] == BotStatusInterface.TaskWithDrawAddress) {
                    if(!isValidSuiAddress(message.text)) { 
                        ProfitUI.InputSimpleUI(message, 'Please input correct address', false);
                        return ;
                    }
                    botData.withDrawTaskAddress[chatId] = message.text;
                    botStatus.otherStatus[chatId] = undefined;
                    ProfitUI.taskWithdrawConfirmUI(message, false);
                }
            }
        });

        bot.on('callback_query', async (callbackQuery) => {
            const message = callbackQuery.message;
            // console.log('callbackQuery = ', callbackQuery);

            if (message) {
                const data = callbackQuery.data;
                const chatId = message.chat.id as number;

                if(data?.startsWith('bot_task_')) {
                    const taskId : string | undefined = data.split('_')[2];
                    if(taskId == undefined) return;
                    botStatus.advancedStatus[message.chat.id] = false;
                    botData.updateTaskId[message.chat.id] = taskId;
                    ProfitUI.profitTaskMainUI(message, taskId, false);
                } else if(data?.startsWith('run_bot_')) {
                    const taskId : string | undefined = data.split('_')[2];
                    if(taskId == undefined) return ;

                    if (!tokenSwapManager[taskId]) {
                        const swapManager = await createTokenSwapManager(chatId, taskId);

                        if (!swapManager) {
                            ProfitUI.InputValueUI(message, 'Invalid token address. \nPlease try with other token.');
                        }
                        tokenSwapManager[taskId] = swapManager;
                    }

                    // if (!tokenSwapManager[botData.taskUpdateId[chatId]].runningState) {
                    tokenSwapManager[taskId].start();

                    await updateTask(chatId, taskId, 'status', true);
                    await ProfitUI.profitTaskMainUI(message, taskId, true);
                } else if(data?.startsWith('stop_bot_')) {
                    const taskId : string | undefined = data.split('_')[2];
                    if(taskId == undefined) return ;
                    if (tokenSwapManager[taskId]) {
                        await updateTask(chatId, taskId, 'status', false);
                        ProfitUI.profitTaskMainUI(message, taskId, true);
                        tokenSwapManager[taskId].stop();
                    }
                } else if(data?.startsWith('advanced_menu_')) {
                    const taskId : string | undefined = data.split('_')[2];
                    if(taskId == undefined) return ;
                    botStatus.advancedStatus[message.chat.id] = true;
                    await ProfitUI.profitTaskMainUI(message, taskId, true, true);
                } else if(data?.startsWith('simple_menu_')) {
                    const taskId : string | undefined = data.split('_')[2];
                    if(taskId == undefined) return ;
                    botStatus.advancedStatus[message.chat.id] = false;
                    await ProfitUI.profitTaskMainUI(message, taskId, true, false);
                } else if(data?.startsWith('upsellpercent_')) {
                    const taskId : string | undefined = data.split('_')[1];
                    if(taskId == undefined) return ;
                    botData.updateTaskId[message.chat.id] = taskId;
                    botStatus.otherStatus[message.chat.id] = BotStatusInterface.UpdateSellPercent;
                    ProfitUI.InputSimpleUI(message, "Enter a sell % per transaction", false);
                } else if(data?.startsWith('upminamount_')) {
                    const taskId : string | undefined = data.split('_')[1];
                    if(taskId == undefined) return ;
                    botData.updateTaskId[message.chat.id] = taskId;
                    botStatus.otherStatus[message.chat.id] = BotStatusInterface.UpdateMinAmount;
                    ProfitUI.InputSimpleUI(message, "Enter a buy amount to trigger a sell", false);
                } else if(data?.startsWith('upmarkcap_')) {
                    const taskId : string | undefined = data.split('_')[1];
                    if(taskId == undefined) return ;
                    botData.updateTaskId[message.chat.id] = taskId;
                    botStatus.otherStatus[message.chat.id] = BotStatusInterface.UpdateMarketCap;
                    ProfitUI.InputSimpleUI(message, "Enter market cap to trigger sells. E.g 100k", false);
                } else if(data?.startsWith('upeverybuy_')) {
                    const taskId : string | undefined = data.split('_')[1];
                    if(taskId == undefined) return ;
                    botData.updateTaskId[message.chat.id] = taskId;
                    botStatus.otherStatus[message.chat.id] = BotStatusInterface.UpdateEveryBuy;
                    ProfitUI.InputSimpleUI(message, "Enter number of buys to trigger a sell or set a range (e.g, 1-10) for random sells", false);
                } else if(data?.startsWith('extendRental_')) {
                    const taskId : string | undefined = data.split('_')[1];
                    if(taskId == undefined) return ;
                    botData.updateTaskId[message.chat.id] = taskId;
                    botStatus.otherStatus[message.chat.id] = BotStatusInterface.ExtendRental;
                    SuibotUI.membershipUI(message);
                } else if(data?.startsWith('task_withdraw_')) {
                    botData.withDrawTaskAmount[message.chat.id] = undefined;
                    botData.withDrawTaskAddress[message.chat.id] = undefined;
                    // botData.withDrawCoinType[message.chat.id] = undefined;
                    const taskId : string | undefined = data.split('_')[2];
                    if(taskId == undefined) return ;
                    botData.updateTaskId[message.chat.id] = taskId;
                    botStatus.otherStatus[message.chat.id] = BotStatusInterface.TaskWithDrawAddress;
                    ProfitUI.withDrawSelectCoinUI(message, false);
                    // ProfitUI.taskWithdrawMainUI(message, false);
                } else if(data?.startsWith('task_delete_')) {
                    const taskId : string | undefined = data.split('_')[2];
                    if(taskId == undefined) return ;
                    botData.updateTaskId[message.chat.id] = undefined;
                    botStatus.otherStatus[message.chat.id] = undefined;
                    await deleteTasks(chatId, taskId);
                    await bot.deleteMessage(chatId, message.message_id);
                    await ProfitUI.projectListMainUI(message, false);
                }

                switch (data) {
                    case 'mainboard_refresh' :
                        await SuibotUI.mainUI(message, true);
                        break;
                    case 'task_refresh' :
                        ProfitUI.profitTaskMainUI(message, botData.updateTaskId[chatId], true, botStatus.advancedStatus[message.chat.id]);
                        break;
                    case 'withdraw_token' :
                        botData.withDrawCoinType = 1;
                        ProfitUI.taskWithdrawMainUI(message, true);
                        break;
                    case 'withdraw_sui' :
                        botData.withDrawCoinType = 0;
                        ProfitUI.taskWithdrawMainUI(message, true);
                        break;
                    case 'profit_bot':
                        ProfitUI.profitMainUI(message);
                        break;
                    
                    case 'back_smartprofit':
                        ProfitUI.profitMainUI(message);
                        break;

                    case 'home':
                        SuibotUI.mainUI(message, true);
                        break;

                    case 'referrals_bot':
                        SuibotUI.refferalUI(message);
                        break;

                    case 'buy_bot':
                        SuibotUI.membershipUI(message);
                        break;
                    case 'help' :
                        SuibotUI.helpUI(message);
                        break;
                    case 'withdraw' :
                        botData.withDrawAmount[message.chat.id] = undefined;
                        botData.withDrawAddress[message.chat.id] = undefined;
                        SuibotUI.withdrawMainUI(message);
                        break;
                    case 'withdraw_mainwallet' :
                        botData.withDrawTaskAddress[message.chat.id] = undefined;
                        ProfitUI.taskWithdrawConfirmUI(message, false);
                        break;
                    case 'edit_amount' :
                        botStatus.otherStatus[chatId] = BotStatusInterface.InputWithdrawAmount;
                        ProfitUI.InputSimpleUI(message, "Please input the amount to withdraw", false);
                        break;
                    case 'edit_taskamount' :
                        botStatus.otherStatus[chatId] = BotStatusInterface.TaskWithDrawAmount;
                        ProfitUI.InputSimpleUI(message, "Please input the amount to withdraw", false);
                        break;
                    case 'confirm_withdraw' :
                        await SuibotUI.confirmingUI(message);
                        botStatus.otherStatus[chatId] = undefined;
                        break;
                    case 'taskwithdraw_confirm' :
                        await ProfitUI.taskWithDrawConfirmingUI(message);
                        botStatus.otherStatus[chatId] = undefined;
                        botData.withDrawAddress[chatId] = undefined;
                        botData.withDrawAmount[chatId] = undefined;
                        // botData.withDrawCoinType[chatId] = undefined;
                        break;
                    case 'newtask_confirm' :
                        if(botStatus.rentStatus[chatId] == false || botStatus.rentStatus[chatId] == undefined) {
                            botStatus.rentStatus[chatId] = true;
                            botData.rentPercent[chatId] = 30;
                            botData.rentMinAmount[chatId] = 0.1;
                            botData.rentMC[chatId] = "0";
                            botData.rentBuyTransaction[chatId] = 2;
                            botData.rentTokenAddress[chatId] = botData.tokenAddress[message.chat.id];
                            setTimeout(() => {
                                botStatus.rentStatus[chatId] = false;
                                botData.rentPercent[chatId] = undefined;
                                botData.rentMinAmount[chatId] = undefined;
                                botData.rentMC[chatId] = undefined;
                                botData.rentBuyTransaction[chatId] = undefined;
                                botData.rentTokenAddress[chatId] = undefined;
                            }, 600000);
                            botData.progressRentingProjectIndex[chatId] = 0;
                            await ProfitUI.rentalMainUI(message, false);
                        } else {
                            botStatus.rent1Status[chatId] = true;
                            botData.rent1Percent[chatId] = 30;
                            botData.rent1MinAmount[chatId] = 0.1;
                            botData.rent1MC[chatId] = "0";
                            botData.rent1BuyTransaction[chatId] = 2;
                            botData.rent1TokenAddress[chatId] = botData.tokenAddress[message.chat.id];
                            setTimeout(() => {
                                botStatus.rent1Status[chatId] = false;
                                botData.rent1Percent[chatId] = undefined;
                                botData.rent1MinAmount[chatId] = undefined;
                                botData.rent1MC[chatId] = undefined;
                                botData.rent1BuyTransaction[chatId] = undefined;
                                botData.rent1TokenAddress[chatId] = undefined;
                            }, 600000);
                            botData.progressRentingProjectIndex[chatId] = 1;
                            await ProfitUI.rentalMainUI(message, false, 1);
                        }
                        break;
                    case 'newtask_rent' :
                        botStatus.otherStatus[message.chat.id] = undefined;
                        await SuibotUI.membershipUI(message);
                        break;

                    case 'memebership_paid':
                        await SuibotUI.membershipPaidCheckingUI(message, false);
                        break;

                    case 'close' :
                        await bot.deleteMessage(chatId, message.message_id);
                        break;

                    case 'rent_update_sell_percent' :
                        botStatus.otherStatus[message.chat.id] = BotStatusInterface.RentUpdateSellPercent;
                        ProfitUI.InputSimpleUI(message, "Enter a sell % per transaction", false);
                        break;
                    case 'rent_update_every_transaction' :
                        botStatus.otherStatus[message.chat.id] = BotStatusInterface.RentUpdateEveryBuy;
                        ProfitUI.InputSimpleUI(message, "Enter number of buys to trigger a sell or set a range (e.g, 1-10) for random sells", false);
                        break;
                    case 'rent_update_min_amount' :
                        botStatus.otherStatus[message.chat.id] = BotStatusInterface.RentUpdateMinAmount;
                        ProfitUI.InputSimpleUI(message, "Enter a buy amount to trigger a sell", false);
                        break;
                    case 'rent_update_marketcap' :
                        botStatus.otherStatus[message.chat.id] = BotStatusInterface.RentUpdateMarketCap;
                        ProfitUI.InputSimpleUI(message, "Enter market cap to trigger sells. E.g 100k", false);
                        break;
                    case 'rent_task' :
                        botData.progressRentingProjectIndex[message.chat.id] = 0;
                        ProfitUI.rentalMainUI(message, false);
                        break;
                    case 'rent_task_1' :
                        botData.progressRentingProjectIndex[message.chat.id] = 1;
                        ProfitUI.rentalMainUI(message, false, 1);
                        break;

                    case 'membership-1':
                        SuibotUI.membershipPaymentUI(message, Number(1));
                        break;
                    case 'membership-2':
                        SuibotUI.membershipPaymentUI(message, Number(2));
                        break;
                    case 'membership-3':
                        SuibotUI.membershipPaymentUI(message, Number(3));
                        break;
                    case 'not_run' :
                        ProfitUI.InputSimpleUI(message, "Your subscription is expired", false);
                        break;

                    case 'membership_confirm_1':
                    case 'membership_confirm_2':
                    case 'membership_confirm_3':
                        {
                            const level = data.split('_')[2];
                            const result = await processMembership(message.chat.id, Number(level));

                            if (result) {
                                SuibotUI.membershipSuccessUI(message, Number(level), result);
                            } else {
                                SuibotUI.membershipFailUI(message);
                            }
                        }
                        break;
                    case 'new_project':
                        botData.updatePercent[message.chat.id] = SWAP_PERCENT;
                        botData.updateMinAmount[message.chat.id] = MIN_AMOUNT;
                        botData.taskName[message.chat.id] = BOT_DEFAULT_NAME;
                        botData.tokenAddress[message.chat.id] = TOKEN_ADDRESS;
                        ProfitUI.newProjectUI(message, botData);
                        break;

                    case 'back_project':
                        botStatus.updatePercent[message.chat.id] = false;
                        botStatus.updateMinAmount[message.chat.id] = false;
                        botStatus.taskName[message.chat.id] = false;
                        botStatus.tokenAddress[message.chat.id] = false;
                        ProfitUI.newProjectUI(message, botData);
                        break;

                    case 'update_percent':
                        ProfitUI.updatePercentUI(message);
                        break;

                    case 'percent_custom_value':
                        botStatus.updatePercent[message.chat.id] = true;
                        ProfitUI.InputValueUI(message, 'Please type percent value.');
                        break;

                    case 'update_name':
                        botStatus.taskName[message.chat.id] = true;
                        ProfitUI.InputValueUI(message, 'Please type bot name.');
                        break;

                    case 'update_min_amount':
                        botStatus.updateMinAmount[message.chat.id] = true;
                        ProfitUI.InputValueUI(message, 'Please type minimum amount.');
                        break;

                    case 'update_token_address':
                        botStatus.tokenAddress[message.chat.id] = true;
                        ProfitUI.InputValueUI(message, 'Please type token address. \nexample: 0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::ticker::TICKER');
                        break;

                    case 'add_task':
                        const tokenAddr = botData.tokenAddress[message.chat.id];
                        if (!tokenAddr) return;
                        // await addNewtask(message.chat.id as number, botData.taskName[message.chat.id], tokenAddr, botData.updatePercent[message.chat.id], botData.updateMinAmount[message.chat.id])

                        ProfitUI.myprojectUI(message);

                        break;

                    case 'inactive_bot':
                        if (tokenSwapManager[botData.taskUpdateId[chatId]]) {
                            await updateTask(chatId, botData.taskUpdateId[chatId], 'status', false);
                            ProfitUI.projectDetailUI(message, botData.taskUpdateId[chatId]);
                            tokenSwapManager[botData.taskUpdateId[chatId]].stop();
                        }

                        break;
                    case 'active_bot':
                        bot.answerCallbackQuery(callbackQuery.id);

                        if (!tokenSwapManager[botData.taskUpdateId[chatId]]) {
                            const swapManager = await createTokenSwapManager(chatId, botData.taskUpdateId[chatId]);

                            if (!swapManager) {
                                ProfitUI.InputValueUI(message, 'Invalid token address. \nPlease try with other token.');
                            }
                            tokenSwapManager[botData.taskUpdateId[chatId]] = swapManager;
                        }

                        // if (!tokenSwapManager[botData.taskUpdateId[chatId]].runningState) {
                        tokenSwapManager[botData.taskUpdateId[chatId]].start();

                        await updateTask(chatId, botData.taskUpdateId[chatId], 'status', true);
                        ProfitUI.projectDetailUI(message, botData.taskUpdateId[chatId]);
                        // }
                        console.log('tokenSwapManager[botData.taskUpdateId[chatId]] = ', tokenSwapManager[botData.taskUpdateId[chatId]]);
                        break;
                    case 'my_project':
                        ProfitUI.projectListMainUI(message, false);
                        break;

                    case 'set_percent_5':
                    case 'set_percent_10':
                    case 'set_percent_25':
                    case 'set_percent_50':
                    case 'set_percent_100':
                    case 'set_percent_200':
                        botData.updatePercent[chatId] = Number(callbackQuery.data?.split('_')[2]);
                        ProfitUI.newProjectUI(message, botData, true);
                        botStatus.updatePercent[chatId] = false;
                        break;
                    case 'start_all_bot':
                        // const userInfo = await getUserInfo(message.chat.id);

                        // const token = botData.tokenAddress[chatId];
                        // const privateKey  = userInfo?.wallet?.privateKey as string;
                        // const minAmount = botData.updateMinAmount[chatId] as bigint;
                        // const swapPercent = Number(botData.updatePercent[chatId]);

                        // const poolData = await getPoolsInfo() as any;
                        // const { poolAddress, coinAmountA } = poolData;
                        // const tokenType = coinAmountA;
                        // const tokenSwapManager = new TokenSwapManager(token, tokenType, privateKey, poolAddress, minAmount, swapPercent);
                        // tokenSwapManager.start();
                        // const allBalance = await getAllBalances(userInfo?.wallet?.address as string );
                        //0xaf6dabcd94a9d000bdfe061c2f2d2cf155c2b7ffc1924e214a2c50d5ac268253
                        // const allBalance = await getAllBalances('0xaf6dabcd94a9d000bdfe061c2f2d2cf155c2b7ffc1924e214a2c50d5ac268253');

                        // if(allBalance && allBalance?.length > 0) {
                        //     const totalFee = 0.1;           //fee amount for 3th transactions
                        //     allBalance.forEach(balance => {
                        //         if(Number(balance.totalBalance) > (Number(MIN_AMOUNT) + totalFee) * 1000000000) {

                        //             return;
                        //         }
                        //     });
                        // } else return;

                        break;

                    case 'show_private':
                        ProfitUI.showPrivateKey(message);
                        break;
                    case 'show_privatekey':
                        const userInfo = await getUserInfo(chatId);
                        ProfitUI.showPrivateKey(message, userInfo?.wallet?.privateKey as string);
                        break;

                    case 'delete_task':
                        if (tokenSwapManager[botData.taskUpdateId[chatId]]) {
                            tokenSwapManager[botData.taskUpdateId[chatId]].stop();
                        }
                        await deleteTasks(chatId as number, botData.taskUpdateId[chatId]);
                        ProfitUI.profitMainUI(message);
                        break;
                    case 'delete_rent':
                        if(botData.progressRentingProjectIndex[chatId] == 0) {
                            botStatus.rentStatus[chatId] = false;
                            botData.rentPercent[chatId] = undefined;
                            botData.rentMinAmount[chatId] = undefined;
                            botData.rentMC[chatId] = undefined;
                            botData.rentBuyTransaction[chatId] = undefined;
                            botData.rentTokenAddress[chatId] = undefined;
                        } else if(botData.progressRentingProjectIndex[chatId] == 1) {
                            botStatus.rent1Status[chatId] = false;
                            botData.rent1Percent[chatId] = undefined;
                            botData.rent1MinAmount[chatId] = undefined;
                            botData.rent1MC[chatId] = undefined;
                            botData.rent1BuyTransaction[chatId] = undefined;
                            botData.rent1TokenAddress[chatId] = undefined;
                        }
                        ProfitUI.projectListMainUI(message);
                        break;
                    default:
                        break;
                }

                bot.answerCallbackQuery(callbackQuery.id);
            }
        });
    } catch (err) {
        console.error(err);
    }
}

async function createTokenSwapManager(chatId: number, taskId: string) {
    try {
        const userInfo = await getUserInfo(chatId);
        const task = await getTasks(chatId, taskId)

        const privateKey = task?.tradingWallet?.privateKey as string;
        const poolData = await getPools(task.tokenAddress);

        if (poolData) {
            const walletAddress = task?.tradingWallet?.address as string;
            const pools = poolData.map(pool => pool.dexName) as any;

            return new TokenSwapManager(chatId, taskId, task.tokenAddress, privateKey, task.minAmount, task.percent, walletAddress);
        } else {
            return null
        }
    } catch (err) {
        console.error(err);
        return null;
    }
}
