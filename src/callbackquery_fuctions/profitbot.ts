import 'dotenv/config'
import TelegramBot, { EditMessageCaptionOptions, SendMessageOptions } from 'node-telegram-bot-api';

import { bot, botData, botStatus } from '../bot';
import { getTasks, getUserInfo } from '../services/users';
import { getPools, getPoolsInfo } from '../services/pools';
import { getBalance } from '../services/wallets';
import { BotStatusInterface, mainSuiClient } from '../services/constant';
import { getCetusSuiSwapPoolAddress } from '../services/poolServices';
import { SUI_DECIMAL, SUI_TYPE } from '../config/constants';
import { CoinBalance, CoinMetadata } from '@mysten/sui/dist/cjs/client';
import { sendOtherToken, sendToken } from '../services/tokenUtils';

interface InlineInterface {
    text : string,
    callback_data : string
}

export async function profitMainUI(message: TelegramBot.Message) {
    try {
        botStatus.otherStatus[message.chat.id] = BotStatusInterface.InputContractAddress;
        // const opts = {
        //     chat_id: message.chat.id,
        //     message_id: message.message_id,
        //     parse_mode: 'HTML',
        //     disable_web_page_preview: true,
        //     reply_markup: {
        //         inline_keyboard: [
        //             [
        //                 {
        //                     text: '🔮 NEW PROJECT',
        //                     callback_data: 'new_project'
        //                 },
        //                 {
        //                     text: 'My Projects',
        //                     callback_data: 'my_project'
        //                 }
        //             ],
        //             [
        //                 {
        //                     text: '← Back',
        //                     callback_data: 'home'
        //                 }, {
        //                     text: 'Help',
        //                     callback_data: 'help'
        //                 }
        //             ]
        //         ],
        //     }
        // };
        const newText = `<strong>Smart Profit Bot 🔮 how it works?</strong>\n\n` + 
        "The bot tracks every incoming buy transaction and sells a set percentage from each buy using different wallets to stay hidden. You can control sell timing and other settings.\n\n" +
        "1️⃣ Simply copy and paste the contract address.\n" + "2️⃣ Rent the bot for the time you want.\n" + 
        "3️⃣ A new wallet will be generated, add tokens to sell.\n" + "4️⃣ Let the bot cook.\n" + "5️⃣ Withdraw all your profits.\n\n" +
        "<strong>✏️ Please, enter a contract address below to start:</strong>\n" + 'example: 0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5g631c26f1::ticker::TICKER';
        bot.sendPhoto(message.chat.id, 'https://ibb.co/prRfC6J', {
            caption : newText,
            parse_mode : 'HTML'
        });
    } catch (err) {
        console.error(err)
    }
}

export async function myprojectUI(message: any) {
    try {
        const userInfo = await getUserInfo(message.chat.id);

        let inlineKeyboard: any = [];
        let newText = 'Here are your bots.';

        if (userInfo.tasks.length) {
            const _inlineKeyboard = userInfo.tasks.map((task: any) => {
                return {
                    text: `${task.status ? '🟢' : '🔴'} ${task.name}`,
                    callback_data: `bot_tasks_${task._id}`
                }
            })

            inlineKeyboard = [
                _inlineKeyboard,
                // [
                //     {
                //         text: 'Start All',
                //         callback_data: 'start_all_bot'
                //     }, {
                //         text: 'Stop All',
                //         callback_data: 'stop_all_bot'
                //     }
                // ]
            ]
        }

        inlineKeyboard = [
            ...inlineKeyboard,
            [
                {
                    text: '← Back',
                    callback_data: 'profit_bot'
                }, {
                    text: '↻ Refresh',
                    callback_data: 'refresh'
                }
            ]
        ]

        console.log('inlineKeyboard = ', inlineKeyboard);

        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        };

        if (!userInfo.tasks.length) {
            newText = `You do not have any projects yet! Create a new project in the Profit Bot menu.`;
        }

        if(message.entities && message.entities[0]?.type == 'bot_command') {
            bot.sendMessage(message.chat.id, newText, opts as TelegramBot.SendMessageOptions);
        } else {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function projectDetailUI(message: any, taskId: string, editable = true, poolAddress?: string, totalBalance?: string) {
    try {
        const task = await getTasks(message.chat.id, taskId);
        let _poolAddress = poolAddress;
        let _totalBalance = totalBalance;

        if (!_poolAddress) {
            const poolData = await getPoolsInfo(task.tokenAddress) as any;
            const userInfo = await getUserInfo(message.chat.id);

            if (poolData) {

                const { poolAddress, coinTypeA, coinTypeB } = poolData;
                _poolAddress = poolAddress;

                const tokenType = coinTypeA === '0x2::sui::SUI' ? coinTypeB : coinTypeA;

                const walletAddress = userInfo?.wallet?.address as string;
                const balance = await getBalance(walletAddress, tokenType);
                _totalBalance = balance?.totalBalance;
            }
        }

        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Update name',
                            callback_data: 'update_name'
                        }
                    ],
                    [
                        {
                            text: 'Update token address',
                            callback_data: 'update_token_address'
                        }
                    ],
                    [
                        {
                            text: 'Update swap percent',
                            callback_data: 'update_percent'
                        }
                    ],
                    [
                        {
                            text: 'Update minimum amount',
                            callback_data: 'update_min_amount'
                        }
                    ],
                    [
                        {
                            text: 'Start task',
                            callback_data: 'active_bot'
                        }, {
                            text: 'Stop task',
                            callback_data: 'inactive_bot'
                        }
                    ],
                    [
                        {
                            text: 'Delete task',
                            callback_data: 'delete_task'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'my_project'
                        }
                    ]
                ],
            }
        };
        const newText = `Please set task options.\n\n` +
            `Name: ${task.name}\n` +
            `Token Address: ${task.tokenAddress}\n` +
            `Percent: ${task.percent} <b>%</b>\n` +
            `Minimum amount: ${task.minAmount} <b>SUI</b>\n` +
            `Bot status: ${task.status ? '🟢' : '🔴'}\n\n` +
            `Pool Address: ${_poolAddress ? _poolAddress : ' - '} \n ` +
            `Balance: ${_totalBalance ? _totalBalance : '0'}`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function newProjectUI(message: any, data: any, editable = true, poolAddress?: string, totalBalance?: string) {
    try {
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Update name',
                            callback_data: 'update_name',
                        }
                    ],
                    [
                        {
                            text: 'Update token address',
                            callback_data: 'update_token_address'
                        }
                    ],
                    [
                        {
                            text: 'Update swap percent',
                            callback_data: 'update_percent'
                        }
                    ],
                    [
                        {
                            text: 'Update minimum amount',
                            callback_data: 'update_min_amount'
                        }
                    ],
                    [
                        {
                            text: 'Save',
                            callback_data: 'add_task'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'profit_bot'
                        }
                    ]
                ],
            }
        };
        const newText = `Please set task options.\n\n` +
            `Name: ${data.taskName[message.chat.id]}\n` +
            `Token Address: ${data.tokenAddress[message.chat.id] ? data.tokenAddress[message.chat.id] : ' - '}\n` +
            `Percent: ${data.updatePercent[message.chat.id]} <b>%</b>\n` +
            `Minimum amount: ${data.updateMinAmount[message.chat.id]} <b>SUI</b>\n` +
            `Pool Address: ${poolAddress ? poolAddress : ' - '} \n` +
            `Balance: ${totalBalance ? totalBalance : '0'}`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function updatePercentUI(message: any) {
    try {
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '5%',
                            callback_data: 'set_percent_5'
                        }
                    ],
                    [
                        {
                            text: '10%',
                            callback_data: 'set_percent_10'
                        }
                    ],
                    [
                        {
                            text: '25%',
                            callback_data: 'set_percent_25'
                        }
                    ],
                    [
                        {
                            text: '50%',
                            callback_data: 'set_percent_50'
                        }
                    ],
                    [
                        {
                            text: '100%',
                            callback_data: 'set_percent_100'
                        }
                    ],
                    [
                        {
                            text: '200%',
                            callback_data: 'set_percent_200'
                        }
                    ],
                    [
                        {
                            text: 'Type custom value',
                            callback_data: 'percent_custom_value'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'new_project'
                        }
                    ]
                ],
            }
        };
        const newText = `Please choose swap percent value.\n\n`;

        bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
            console.log("walletUI part:", error);
        });
    } catch (err) {
        console.error(err)
    }
}

export async function InputValueUI(message: any, text: string, editable = true, callback = "_____") {
    try {
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '← Back',
                            callback_data: `${callback}`
                        }
                    ]
                ],
            }
        };
        const newText = `${text}\n\n`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function InputSimpleUI(message: any, text: string, editable = true) {
    try {
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        };
        const newText = `${text}\n\n`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function refreshUI(message: any) {
    try {
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🔴$SUI_N1',
                            callback_data: 'sui_n1'
                        }
                    ], [
                        {
                            text: '🟢$SUI_N1',
                            callback_data: 'suiN2UI'
                        }
                    ], [
                        {
                            text: 'Start All',
                            callback_data: 'profit_bot'
                        }, {
                            text: 'Stop All',
                            callback_data: 'refresh'
                        }
                    ], [
                        {
                            text: '← Back',
                            callback_data: 'profit_bot'
                        }, {
                            text: '↻ Refresh',
                            callback_data: 'refresh'
                        }
                    ]
                ],
            }
        };
        const newText = `Here’s a list of your Profit Bot projects, click on them for more advanced settings.`;

        bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
            console.log("walletUI part:", error);
        });
    } catch (err) {
        console.error(err)
    }
}


export async function showPrivateKey(message: any, privateKey?: string) {
    try {
        console.log("private key ===>", privateKey);
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text : '📤 WITHDRAW',
                            callback_data : 'withdraw'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'home'
                        }, {
                            text: '↻ Refresh',
                            callback_data: 'refresh'
                        }
                    ]
                ],
            }
        };
        // 💳 Your Main Wallet:
        // 0x0feb54a725aa357ff2f5bc6bb023c05b310285bd861275a30521f339a434eba3

        // The wallet is persistent and is not going to change. Feel free to top it up and use it to create new projects or extend the existing ones.

        // 🔐 Private key:
        // ### Put private key under a spoiler
        const newText = `<strong>💳 Your Main Wallet:</strong> \n` + `<code>${userInfo?.wallet?.address}</code>\n\n` +
            "The wallet is persistent and is not going to change. Feel free to top it up and use it to create new projects or extend the existing ones.\n\n" +
            "🔐 Private key:\n" +
            `<i><code>${userInfo?.wallet?.privateKey ? userInfo?.wallet?.privateKey : ''}</code></i>\n\n`;
        if(message.entities && message.entities[0]?.type == 'bot_command') {
            bot.sendMessage(message.chat.id, newText, opts as TelegramBot.SendMessageOptions);
        } else {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function createTaskConfirmationUI (message : TelegramBot.Message) {
    try {
        if(message.text == undefined) return;
        botData.tokenAddress[message.chat.id] = message.text;
        botStatus.otherStatus[message.chat.id] = undefined;
        const splitData : Array<string> = message.text.split('::');
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: "Markdown",
            // disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '✅ CONFIRM',
                            callback_data: 'newtask_confirm'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'profit_bot'
                        }
                    ]
                ],
            }
        };

        const result = await getPools(message.text);
        let newText : string = "" ;
        if(result != null)
            newText = `[${splitData[2]}](https://dexscreener.com/sui/${result[0]?.poolAddress})`;
        else {
            await InputValueUI(message, "Sorry, we only support tokens on Cetus, BlueMove and Turbos liquidity pools at the moment", false, 'back_smartprofit');
            return;
        }
        bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                    console.log("New TasK Confirm Part:", error);
                });

        // if (editable) {
        //     bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
        //         console.log("walletUI part:", error);
        //     });
        // } else {
        //     bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
        //         console.log("walletUI part:", error);
        //     });
        // }
    } catch (err) {
        console.error(err)
    }
}

export async function rentalMainUI(message: any, editable = true, index = 0) {
    try {
        console.log("advanced ===>", index);
        const rentPercent = index == 0 ? botData.rentPercent : botData.rent1Percent;
        const rentBuyTransaction = index == 0 ? botData.rentBuyTransaction : botData.rent1BuyTransaction;
        const rentMinAmount = index == 0 ? botData.rentMinAmount : botData.rent1MinAmount;
        const rentMC = index == 0 ? botData.rentMC : botData.rent1MC;
        const rentTokenAddress = index == 0 ? botData.rentTokenAddress : botData.rent1TokenAddress;
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🔐 RENT',
                            callback_data: 'newtask_rent'
                        }
                    ],
                    [
                        {
                            text: `✏️ Sell ${rentPercent[message.chat.id]}%`,
                            callback_data: 'rent_update_sell_percent'
                        },
                        {
                            text: `✏️ Sell every ${rentBuyTransaction[message.chat.id]} buys`,
                            callback_data: 'rent_update_every_transaction'
                        }
                    ],
                    [
                        {
                            text: `✏️ Sell if buy > ${rentMinAmount[message.chat.id]} Sui`,
                            callback_data: 'rent_update_min_amount'
                        },
                        {
                            text: `✏️ Sell if MC > ${rentMC[message.chat.id]}`,
                            callback_data: 'rent_update_marketcap'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: '___'
                        },
                        {
                            text: '🗑 DELETE',
                            callback_data: 'delete_rent'
                        },
                        {
                            text: '↻ Refresh',
                            callback_data: '___'
                        }
                    ]
                ],
            }
        };
        const splitData = rentTokenAddress[message.chat.id].split("::");
        const result = await getPools(rentTokenAddress[message.chat.id]);
        let link : string;
        if(result != null)
            link = `https://dexscreener.com/sui/${result[0]?.poolAddress}`;
        else
            link = `https://dexscreener.com/sui/${splitData[0]}`;
        const newText = `🔐 [${splitData[2]}](${link}) - Awaiting\n\n` + "Your project wallet: -\n\n" + "Token Balance: -\n\n" + "SUI Balance: -\n\n" + 
        "Rental Time Left: -\n\n" + "💡 This is your Project’s menu. Feel free to preset any settings. Click the button below to rent the bot for the time you want. If not rented, this project will be automatically removed in 15 minutes";

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function profitTaskMainUI(message: any, taskId : string, editable = true, advanced = false) {
    try {
        console.log("taskId ====>", taskId);
        console.log("advanced ===>", advanced);
        const taskInfo = await getTasks(message.chat.id, taskId);
        const result = await getPools(taskInfo.tokenAddress);
        let link : string;
        if(result != null)
            link = `https://dexscreener.com/sui/${result[0]?.poolAddress}`;
        else
            link = `https://dexscreener.com/sui/${taskInfo.tokenAddress.split('::')[0]}`;
        console.log("taskInfo ===>", taskInfo);
        
        const tokenBalance : CoinBalance | null = await getBalance(taskInfo.tradingWallet.address, taskInfo.tokenAddress);
        const depositTokenBalance : CoinBalance | null = await getBalance(taskInfo.taskWallet.address, taskInfo.tokenAddress);
        const suiBalance : CoinBalance | null = await getBalance(taskInfo.tradingWallet.address, SUI_TYPE);
        const depositSuiBalance : CoinBalance | null = await getBalance(taskInfo.taskWallet.address, SUI_TYPE);
        const tokenInfo : CoinMetadata | null = await mainSuiClient.getCoinMetadata({coinType : taskInfo.tokenAddress});
        if(tokenBalance == null || suiBalance == null || tokenInfo == null || depositSuiBalance == null || depositTokenBalance == null)   return;
        console.log("token balance ===>", tokenBalance);
        // const displaySuiBalance : string = (parseFloat(suiBalance.totalBalance)/Math.pow(10, SUI_DECIMAL) + parseFloat(depositSuiBalance.totalBalance)/Math.pow(10, SUI_DECIMAL)).toFixed(2);
        let displaySuiBalance : string = (parseFloat(suiBalance.totalBalance)/Math.pow(10, SUI_DECIMAL) - 0.1).toFixed(2);
        if(parseFloat(displaySuiBalance) <= 0)   displaySuiBalance = '0.00';
        const displayTokenBalance : string = (parseFloat(tokenBalance.totalBalance)/Math.pow(10, tokenInfo.decimals) + parseFloat(depositTokenBalance.totalBalance)/Math.pow(10, tokenInfo.decimals)).toFixed(2);

        const nowDate : any = new Date();
        const timeDifference = taskInfo.endDate - nowDate;
        const hours = Math.max(0,Math.floor(timeDifference / (1000 * 60 * 60)));
        const minutes = Math.max(0,Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)));
        
        // console.log("day ====>", day);
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `${taskInfo.status == false ? '🟢 RUN' : '🔴 STOP'}`,
                            callback_data: `${taskInfo.status == false ? (hours == 0 && minutes == 0 ? 'not_run' : `run_bot_${taskId}`) : `stop_bot_${taskId}`}`
                        }
                    ],
                    [
                        {
                            text: `✏️ Sell ${taskInfo.percent}%`,
                            callback_data: `upsellpercent_${taskId}`
                        },
                        {
                            text: `✏️ Sell every ${taskInfo.everyBuy} buys`,
                            callback_data: `upeverybuy_${taskId}`
                        }
                    ],
                    [
                        {
                            text: '↓ Advanced Menu',
                            callback_data: `advanced_menu_${taskId}`
                        }
                    ],
                    [
                        {
                            text: 'Extend Rental',
                            callback_data: `extendRental_${taskId}`
                        },
                        {
                            text: 'Withdraw',
                            callback_data: `task_withdraw_${taskId}`
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'my_project'
                        },
                        {
                            text: '🗑 DELETE',
                            callback_data: `task_delete_${taskId}`
                        },
                        {
                            text: '↻ Refresh',
                            callback_data: 'task_refresh'
                        }
                    ]
                ],
            }
        };
        const optsAdvanced = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `${taskInfo.status == false ? '🟢 RUN' : '🔴 STOP'}`,
                            callback_data: `${taskInfo.status == false ? (hours == 0 && minutes == 0 ? 'not_run' : `run_bot_${taskId}`) : `stop_bot_${taskId}`}`
                        }
                    ],
                    [
                        {
                            text: `✏️ Sell ${taskInfo.percent}%`,
                            callback_data: `upsellpercent_${taskId}`
                        },
                        {
                            text: `✏️ Sell every ${taskInfo.everyBuy} buys`,
                            callback_data: `upeverybuy_${taskId}`
                        }
                    ],
                    [
                        {
                            text: `✏️ Sell if buy > ${taskInfo.minAmount} Sui`,
                            callback_data: `upminamount_${taskId}`
                        },
                        {
                            text: `✏️ Sell if MC > ${taskInfo.marketCap}`,
                            callback_data: `upmarkcap_${taskId}`
                        }
                    ],
                    [
                        {
                            text: '🟢 Low balance alert',
                            callback_data: '____'
                        },
                        {
                            text: '🟢 Low rental alert',
                            callback_data: '____'
                        }
                    ],
                    [
                        {
                            text: '↑ Simple Menu',
                            callback_data: `simple_menu_${taskId}`
                        }
                    ],
                    [
                        {
                            text: 'Extend Rental',
                            callback_data: `extendRental_${taskId}`
                        },
                        {
                            text: 'Withdraw',
                            callback_data: `task_withdraw_${taskId}`
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'my_project'
                        },
                        {
                            text: '🗑 DELETE',
                            callback_data: `task_delete_${taskId}`
                        },
                        {
                            text: '↻ Refresh',
                            callback_data: '_______'
                        }
                    ]
                ],
            }
        };


        const newText = `${taskInfo.status == true ? '🟢' : '🔴'} [${taskInfo.name}](${link}) - ${taskInfo.status == true ? 'running' : 'stop'}\n\n`
        + `*Your ${taskInfo.name} wallet:*\n` + `_${taskInfo.taskWallet.address}_\n\n` + `*Tokne Balance* : _${displayTokenBalance}_\n\n` +
        `*SUI Balance* : _${displaySuiBalance}_\n\n` + `*Rental Time Left* : _${hours}h ${minutes}m_` ;
        if (editable) {
            const disOpts = advanced == true ? optsAdvanced : opts;
            bot.editMessageText(newText, disOpts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            const disOpts = advanced == true ? optsAdvanced : opts;
            bot.sendMessage(message.chat.id, newText, disOpts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function projectListMainUI(message: TelegramBot.Message, editable = true) {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        let inlineList : Array<any> = [];
        if(botStatus.rentStatus[message.chat.id] == true) {
            const splitData = botData.rentTokenAddress[message.chat.id].split('::');
            inlineList.push([{
                text : `🔴 ${splitData[2]} | Renting Project`,
                callback_data : `rent_task`
            }]);
        }
        if(botStatus.rent1Status[message.chat.id] == true) {
            const splitData = botData.rent1TokenAddress[message.chat.id].split('::');
            inlineList.push([{
                text : `🔴 ${splitData[2]} | Renting Project`,
                callback_data : `rent_task_1`
            }]);
        }
        for(let i = 0; i < userInfo.tasks.length; i++) {
            const nowDate : any = new Date();
            const timeDifference = userInfo.tasks[i]?.endDate as any - nowDate;
            const hours = Math.max(0, Math.floor(timeDifference / (1000 * 60 * 60)));
            const minutes = Math.max(0, Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)));
            const logo : string = userInfo.tasks[i]?.status == true ? '🟢' : '🔴';
            inlineList.push([{
                text : `${logo} ${userInfo.tasks[i]?.name} | Time Left : ${hours}h ${minutes}m 🔮`,
                callback_data : `bot_task_${userInfo.tasks[i]?._id.toString()}`
            }]);
        }
        inlineList.push([{ text: '← Back', callback_data: 'home'}]);
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: inlineList,
            }
        };
        const newText = `Here’s a list of your current projects. Feel free to navigate between them.`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}

export async function taskWithdrawMainUI(message: any, editable = true) {
    try {
        const task = await getTasks(message.chat.id, botData.updateTaskId[message.chat.id]);
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `💳 TO MAIN WALLET`,
                            callback_data: 'withdraw_mainwallet'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: '____'
                        },
                        {
                            text: '✏️ Edit Amount',
                            callback_data: 'edit_taskamount'
                        }
                    ]
                ],
            }
        };
        let balance : CoinBalance | null;
        let decimal : any;
        if(botData.withDrawCoinType == 1) {
            balance = await getBalance(task.tradingWallet.address, task.tokenAddress);
            const metaData = await mainSuiClient.getCoinMetadata({coinType : task.tokenAddress});
            decimal = metaData?.decimals;
        }
        else {
            balance = await getBalance(task.tradingWallet.address, SUI_TYPE);
            decimal = SUI_DECIMAL;
        }
        console.log("balance ===>", balance);
        if(balance == null) return;
        let displayBalance : any = parseFloat(balance.totalBalance) / Math.pow(10, decimal) - 0.1;
        console.log("displayBalance ===>", displayBalance);
        if(displayBalance < 0) displayBalance = 0;
        displayBalance = displayBalance.toFixed(2);
        if(botData.withDrawTaskAmount[message.chat.id] == undefined) botData.withDrawTaskAmount[message.chat.id] = displayBalance;
        const newText = `Enter an address to withdraw ${botData.withDrawTaskAmount[message.chat.id]} ${botData.withDrawCoinType == 1 ? task.name : 'SUI'}`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}


export async function taskWithdrawConfirmUI(message: any, editable = true) {
    try {
        const userInfo = await getUserInfo(message.chat.id);
        const task = await getTasks(message.chat.id, botData.updateTaskId[message.chat.id]);
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '✅ CONFIRM',
                            callback_data: 'taskwithdraw_confirm'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: '____'
                        }
                    ]
                ],
            }
        };
        const toAddress = botData.withDrawTaskAddress[message.chat.id] == undefined ? '/wallet' : botData.withDrawTaskAddress[message.chat.id];
        const newText = `Please. confirm.\n\n` + `Amount : ${botData.withDrawTaskAmount[message.chat.id]} SUI\n`
        + `From : ${task.name} ${task.taskWallet.address.slice(0,4)}...${task.taskWallet.address.slice(-3)}\n`
        + `To : 💳 ${toAddress}`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}


export const taskWithDrawConfirmingUI = async (message : TelegramBot.Message) => {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        const taskInfo = await getTasks(message.chat.id, botData.updateTaskId[message.chat.id]);
        const chatId = message.chat.id as number;
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Close',
                            callback_data: 'close'
                        }
                    ]
                ],
            }
        };
        let balance : any = "";
        if(taskInfo.tradingWallet.address) {
            if(botData.withDrawCoinType == 0) {
                balance = await getBalance(taskInfo.tradingWallet.address, SUI_TYPE);
                balance = balance?.totalBalance;
                balance = (parseFloat(balance)/Math.pow(10, SUI_DECIMAL) - 0.05).toFixed(2);
            } else {
                balance = await getBalance(taskInfo.tradingWallet.address, taskInfo.tokenAddress);
                balance = balance?.totalBalance;
                const metaData = await mainSuiClient.getCoinMetadata({coinType : taskInfo.tokenAddress});
                const decimal : any = metaData?.decimals;
                balance = (parseFloat(balance)/Math.pow(10, decimal) - 1).toFixed(2);
            }
        }
        InputSimpleUI(message, "⏳ Sending transaction…", false);

        let digest : any;
        console.log("taskwithdraw amount ===>", botData.withDrawTaskAmount[chatId]);
        const sendAmount = botData.withDrawTaskAmount[chatId] == undefined ? balance : botData.withDrawTaskAmount[chatId];
        const receiverAddress = botData.withDrawTaskAddress[chatId] == undefined ? userInfo.wallet?.address : botData.withDrawTaskAddress[chatId]; 
        if(taskInfo.tradingWallet.privateKey && sendAmount > 0.05 && botData.withDrawCoinType == 0)
            digest = await sendToken(receiverAddress, taskInfo.tradingWallet.privateKey, BigInt(parseFloat(sendAmount) * Math.pow(10, SUI_DECIMAL)));
        else if(botData.withDrawCoinType == 1) {
            digest = await sendOtherToken(receiverAddress, taskInfo.tradingWallet.privateKey, taskInfo.tokenAddress);
        }
        console.log("digest ====>", digest);
        let newText : string = "";
        if(sendAmount <= 0.05) {
            newText = "You don't have balance to withdraw. You have to hold at least 0.05 sui in task wallet";
        } else {
            if(digest == null)
                newText = "Failed txn";
            else
                newText = "✅ Transaction successful!" +`[View on Explorer](https://suiscan.xyz/mainnet/tx/${digest})` + "\n\n" + `Amount: ${botData.withDrawTaskAmount[chatId] == undefined ? balance : botData.withDrawTaskAmount[chatId]}\n\n`
                        + `From :  ${taskInfo.taskWallet.address}\n` + `To: ${botData.withDrawTaskAddress[chatId] != undefined ? botData.withDrawTaskAddress[chatId] : "💳 /wallet"}`;
        }
        // if (editable) {
        //     bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
        //         console.log("walletUI part:", error);
        //     });
        // } else {
        bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
            console.log("walletUI part:", error);
        });
        // }
    } catch (err) {
        console.error(err)
    }
}

export async function withDrawSelectCoinUI(message: TelegramBot.Message, editable = true, callback = "_____") {
    try {
        const taskInfo = await getTasks(message.chat.id, botData.updateTaskId[message.chat.id]);
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: taskInfo.name,
                            callback_data: `withdraw_token`
                        },
                        {
                            text: 'Sui',
                            callback_data: `withdraw_sui`
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: `${callback}`
                        }
                    ]
                ],
            }
        };
        const newText = `Choose the tokens you want to withdraw`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        } else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err)
    }
}