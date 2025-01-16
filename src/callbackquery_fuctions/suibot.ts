import 'dotenv/config'
import TelegramBot, { EditMessageCaptionOptions, SendMessageOptions } from 'node-telegram-bot-api';

import { bot, botData, botStatus } from '../bot';
import { addNewtask, getTasks, getUserInfo, updateTask } from '../services/users';

import { MEMBERSHIP_1, MEMBERSHIP_2, MEMBERSHIP_3, SUI_TYPE, SUI_DECIMAL, MINIMUM_AMOUNT, DISCOUNT_RATE } from '../config/constants';
import { createNewSuiWallet, getAllBalances, getBalance } from '../services/wallets';
import { formatDateString } from '../utils';
import { CoinBalance } from '@mysten/sui/dist/cjs/client';
import { BotStatusInterface, mainSuiClient } from '../services/constant';
import * as ProfitUI from './profitbot';
import { sendToken } from '../services/tokenUtils';
import { Redis } from '@upstash/redis';

export const redis = new Redis({
    url: 'https://glorious-grouper-25901.upstash.io',
    token: 'AWUtAAIjcDE0NjhlYTljODIxNzA0ZTFjOWFlN2FhNjhlNmNhMmRjNXAxMA'
});

const BOT_NAME = process.env.TELEGRAM_BOT_USERNAME;

export async function mainUI(message: any, editable: boolean = true) {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        // const opts = {
        //     chat_id: message.chat.id,
        //     message_id: message.message_id,
        //     parse_mode: 'HTML',
        //     disable_web_page_preview: true,
        //     reply_markup: {
        //         inline_keyboard: [
        //             [
        //                 {
        //                     text: '🔮 PROFIT BOT',
        //                     callback_data: 'profit_bot'
        //                 },
        //                 {
        //                     text: '💧 VOLUME BOT',
        //                     callback_data: 'volume_bot'
        //                 }
        //             ],
        //             [
        //                 {
        //                     text: '💰 Subscribe',
        //                     callback_data: 'buy_bot'
        //                 }
        //             ],
        //             [
        //                 {
        //                     text: '🎁 Referrals',
        //                     callback_data: 'referrals_bot'
        //                 },
        //                 {
        //                     text: '📤 Show Private',
        //                     callback_data: 'show_private'
        //                 }
        //             ]
        //         ],
        //     }
        // };

        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🔮 SMART PROFIT',
                            callback_data: 'profit_bot'
                        },
                        // {
                        //     text: '💧 SMART VOLUME',
                        //     callback_data: 'volume_bot'
                        // }
                    ],
                    [
                        {
                            text: 'Projects',
                            callback_data: 'my_project'
                        },
                        {
                            text: '💰 Referrals',
                            callback_data: 'referrals_bot'
                        },
                        {
                            text: 'Wallet',
                            callback_data: 'show_private'
                        }
                    ],
                    [
                        {
                            text: 'Help',
                            callback_data: 'help'
                        },
                        {
                            text: '↻ Refresh',
                            callback_data: 'mainboard_refresh'
                        }
                    ]
                ],
            }
        };

        const balance: CoinBalance | null = userInfo?.wallet?.address != undefined ? await getBalance(userInfo?.wallet?.address, SUI_TYPE) : null;
        let displayBalance = "0";
        if (balance != null) {
            displayBalance = (parseFloat(balance.totalBalance) / Math.pow(10, SUI_DECIMAL)).toFixed(2);
        }
        const newText = `<strong>Welcome to SMART SUI!</strong>\n\n <strong>💳 Your Main Wallet:</strong>\n\n` +
            `<code>${userInfo?.wallet?.address}</code>\n\n` + `Balance : ${displayBalance} SUI\n\n—————\n\n` +
            "🔮 SMART PROFIT — The smartest way to sell your tokens and maximize the profits without nuking your chart. Pay a fixed amount per token for rental.\n\n";
        // "💧SMART VOLUME — Bring volume to your project, increase holders count and rank higher on DEX the smart way. Pay a fixed amount per token for rental.";
        // `Balance: ${balance} <b>SUI</b>\n`;
        // `Click on the Refresh button to update your current balance.\n\n`;
        // `Join our Telegram group @SmartSui and follow us on Twitter!`;

        if (editable) {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("MainUI:", error);
            });
        }
        else {
            bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions);
        }
    } catch (err) {
        console.error(err)
    }
}

export async function refferalUI(message: any) {
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
                            callback_data: 'home'
                        }
                    ]
                ],
            }
        };
        const referralLink = `https://t.me/${BOT_NAME}?start=${message.chat.id}`;
        const newText = `
                Referrals 💰 how it works?

                Invite friends to earn 10% of all their payments while they enjoy a 10% discount forever! You also earn from your friends' referrals! Rewards are paid daily and sent directly to your Main wallet

                Layer 1 - 10% reward
                Layer 2 - 3.5% reward
                Layer 3 - 1.5% reward
                Layer 4 - 0.5% reward

                Users Referred: 6 (direct: 3, indirect: 3)
                Reward Paid: 1.3 SUI

                Your referral link:\n<code>${referralLink}</code>\n\n
            `;

        if (message.entities && message.entities[0]?.type == 'bot_command') {
            bot.sendPhoto(message.chat.id, '../db/Referral_System.jpg', {
                caption: newText
            })
            // bot.sendMessage(message.chat.id, newText, opts as TelegramBot.SendMessageOptions);
        } else {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

export async function helpUI(message: any) {
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
                            text: '📨 Support',
                            url: 'https://t.me/SmartSui_Support'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'home'
                        }
                    ]
                ],
            }
        };
        const newText = `<strong>About us:</strong>\n\nThis is the Sui Profit bot. Tracking the trading events in Cetus, Turbos, Bluemove dex.\n\n`;

        if (message.entities && message.entities[0]?.type == 'bot_command') {
            bot.sendMessage(message.chat.id, newText, opts as TelegramBot.SendMessageOptions);
        } else {
            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

export async function refferalInputUI(message: any) {
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
                            text: 'Skip ->',
                            callback_data: 'home'
                        }
                    ]
                ],
            }
        };

        const newText = `Welcome to reach out bot!\n\nWho referred you? Please input username.\nExample: @username\n\n`;

        bot.sendMessage(message.chat.id, newText, opts as EditMessageCaptionOptions).catch((error: any) => {
            console.log("walletUI part:", error);
        });
    } catch (err) {
        console.error(err);
    }
}

export async function membershipUI(message: any) {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        const address = userInfo.wallet?.address as string;

        const suiBalanceData = await getBalance(address, SUI_TYPE);
        const suiBalance = suiBalanceData ? Number(suiBalanceData.totalBalance) / Math.pow(10, SUI_DECIMAL) : 0;

        const membershipHistory = userInfo.membershipHistory;
        let currentMembership = null;
        let membership = null;

        if (membershipHistory && membershipHistory.length > 0) {
            currentMembership = membershipHistory[membershipHistory.length - 1];

            if (currentMembership?.level === 1) {
                membership = MEMBERSHIP_1
            } else if (currentMembership?.level === 2) {
                membership = MEMBERSHIP_2
            } else if (currentMembership?.level === 3) {
                membership = MEMBERSHIP_3
            }
        }

        if (userInfo.referral?.isLink && membership !== null) {
            membership = {
                ...membership,
                cost: membership?.cost * 0.9
            };
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
                            text: `${MEMBERSHIP_1.date} hour - ${userInfo.referral?.isLink ? +(MEMBERSHIP_1.cost * 0.9).toFixed(3) : MEMBERSHIP_1.cost} SUI`,
                            callback_data: 'membership-1'
                        }
                    ],
                    [
                        {
                            text: `${MEMBERSHIP_2.date} hours - ${userInfo.referral?.isLink ? +(MEMBERSHIP_2.cost * 0.9).toFixed(3) : MEMBERSHIP_2.cost} SUI`,
                            callback_data: 'membership-2'
                        }
                    ],
                    [
                        {
                            text: `${MEMBERSHIP_3.date} hours - ${userInfo.referral?.isLink ? +(MEMBERSHIP_3.cost * 0.9).toFixed(3) : MEMBERSHIP_3.cost} SUI`,
                            callback_data: 'membership-3'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'home'
                        }
                    ]
                ],
            }
        };

        // let text = 'Please choose your plan.\n\n';

        // if (currentMembership && membership) {
        //     text = `Your current membership: <b>${membership.name} plan</b>\n` + 
        //     `Time: <i>${formatDateString(currentMembership?.endTime as string)}</i> (UTC)`;
        // }

        // const newText = `${text}\n` +
        //     `Your SUI balance: <code>${suiBalance}</code> SUI`;
        const newText = "🔮 Choose your rental time for this project. You can extend it at any time";

        bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error: any) => {
            console.log("walletUI part:", error);
        });
    } catch (err) {
        console.error(err);
    }
}

export async function membershipPaymentUI(message: any, level: number) {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        const address = userInfo.wallet?.address as string;
        botData.membershipLevel[message.chat.id] = level;

        const membershipHistory = userInfo.membershipHistory as any;
        let isMembership = false;

        if (membershipHistory && membershipHistory.length > 0) {
            const now = new Date().toISOString();

            if (membershipHistory[membershipHistory.length - 1].endTime > now) {
                isMembership = true;
            }
        }

        let membershipAmount = 0;

        if (level === 1) {
            membershipAmount = userInfo.referral?.isLink ? +(MEMBERSHIP_1.cost * 0.9).toFixed(3) : MEMBERSHIP_1.cost;
        } else if (level === 2) {
            membershipAmount = userInfo.referral?.isLink ? +(MEMBERSHIP_2.cost * 0.9).toFixed(3) : MEMBERSHIP_2.cost;
        } else if (level === 3) {
            membershipAmount = userInfo.referral?.isLink ? +(MEMBERSHIP_3.cost * 0.9).toFixed(3) : MEMBERSHIP_3.cost;
        }

        // let text = '';
        // let replyMarks = [];

        // if (suiBalance < membershipAmount * (1 - discount) + MINIMUM_AMOUNT) {
        //     text = 'Insufficiant balance.\n\nPlease charge your balance.';
        //     replyMarks = [
        //         {
        //             text: '← Back',
        //             callback_data: 'buy_bot'
        //         }
        //     ]
        // } else {
        //     text = `${isMembership ? 'Your current plan will be canceled.\n' : ''}Please confirm your plan.\n\n`;
        //     replyMarks = [
        //         {
        //             text: 'Confirm',
        //             callback_data: `membership_confirm_${level}`
        //         },
        //         {
        //             text: 'Cancel',
        //             callback_data: 'buy_bot'
        //         }
        //     ]
        // }

        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '✅ I PAID',
                            callback_data: "memebership_paid"
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: "back"
                        }
                    ]
                ],
            }
        };

        // const newText = text +
        //     `Your SUI balance: ${suiBalance} SUI\n` +
        //     `Membership fee: ${membershipAmount} SUI\n` +
        //     `${discount !== 1 ? `Discount: ${membershipAmount} SUI\n` : ''}` +
        //     `Minimum hold amount: ${MINIMUM_AMOUNT} SUI`;
        const newText = "Add a minimum deposit to your main wallet to continue. This covers rental time, and you won't need to pay more.\n\n" +
            `📥 Left to deposit: ${membershipAmount} sui\n\n` + "💳 To:\n" + `${address}`;

        bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error: any) => {
            console.log("walletUI part:", error);
        });
    } catch (err) {
        console.error(err);
    }
}

export async function membershipPaidCheckingUI(message: TelegramBot.Message, editable = false) {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        if (!userInfo?.wallet?.address || !userInfo?.wallet?.privateKey) return;

        // const opts = {
        //     chat_id: message.chat.id,
        //     message_id: message.message_id,
        //     parse_mode: 'HTML',
        //     disable_web_page_preview: true,
        //     reply_markup: {
        //         inline_keyboard: [
        //             [
        //                 {
        //                     text: 'Close',
        //                     callback_data: 'back_project'
        //                 }
        //             ]
        //         ],
        //     }
        // };

        await ProfitUI.InputSimpleUI(message, '⏳ Checking the wallet...', false);
        let membershipAmount: number = 0;
        let membershipDate: number = 0;
        switch (botData.membershipLevel[message.chat.id]) {
            case 1:
                membershipAmount = MEMBERSHIP_1.cost;
                membershipDate = MEMBERSHIP_1.date;
                break;
            case 2:
                membershipAmount = MEMBERSHIP_2.cost;
                membershipDate = MEMBERSHIP_2.date;
                break;
            case 3:
                membershipAmount = MEMBERSHIP_3.cost;
                membershipDate = MEMBERSHIP_3.date;
                break;
            default:
                break;
        }

        if (userInfo.referral?.isLink) {
            membershipAmount = membershipAmount * (1 - DISCOUNT_RATE / 100);
        }

        const mainBalance: CoinBalance | null = await getBalance(userInfo.wallet?.address, SUI_TYPE);
        if (mainBalance == null) return;
        console.log("memebership amount ===>", membershipAmount);
        console.log("total balance ===>", mainBalance.totalBalance);
        if (membershipAmount * Math.pow(10, SUI_DECIMAL) > parseFloat(mainBalance.totalBalance)) {
            ProfitUI.InputSimpleUI(message, "Not enough balance in main wallet. Check again please!!!", false);
            return;
        }
        if (process.env.COMPANY_WALLET_ADDRESS == undefined) {
            console.log("company wallet address is undefined");
            return;
        }
        const digest = await sendToken(process.env.COMPANY_WALLET_ADDRESS, userInfo?.wallet?.privateKey, BigInt(+(membershipAmount - 0.1).toFixed(3) * Math.pow(10, SUI_DECIMAL)));
        console.log("tx ===>", digest);

        let newText: any, opts: any;
        if (botStatus.otherStatus[message.chat.id] != BotStatusInterface.ExtendRental) {
            const newTaskWallet = createNewSuiWallet();
            const chatId = message.chat.id;
            const rentTokenAddress = botData.progressRentingProjectIndex[chatId] == 0 ? botData.rentTokenAddress[chatId] : botData.rent1TokenAddress[chatId];
            const sellPercent = botData.progressRentingProjectIndex[chatId] == 0 ? botData.rentPercent[chatId] : botData.rent1Percent[chatId];
            const minAmount = botData.progressRentingProjectIndex[chatId] == 0 ? botData.rentMinAmount[chatId] : botData.rent1MinAmount[chatId];
            const tokenAddress: string = rentTokenAddress;
            const splitData: Array<string> = tokenAddress.split('::');
            if (splitData[2] == undefined) return;
            const response = await addNewtask(message.chat.id, splitData[2], tokenAddress, sellPercent, minAmount, botData.membershipLevel[message.chat.id], newTaskWallet);
            const taskId = response.tasks[response.tasks.length - 1]?._id;
            console.log("taskId ===>", taskId);
            console.log("response ==>", response);
            newText = `✅ Success!\n\n` + `Your ${splitData[2]} Wallet:\n` + `<code>${newTaskWallet.address}</code>\n\n` +
                `🔮Just send ${splitData[2]} tokens to the wallet above, and the bot will start automatically!\n\n` +
                "Private key:\n" + `<code>${newTaskWallet.privateKey}</code>`;
            if (botData.progressRentingProjectIndex[chatId] == 0) {
                botStatus.rentStatus[chatId] = false;
                botData.rentPercent[chatId] = undefined;
                botData.rentMinAmount[chatId] = undefined;
                botData.rentMC[chatId] = undefined;
                botData.rentBuyTransaction[chatId] = undefined;
                botData.rentTokenAddress[chatId] = undefined;

            } else {
                botStatus.rent1Status[chatId] = false;
                botData.rent1Percent[chatId] = undefined;
                botData.rent1MinAmount[chatId] = undefined;
                botData.rent1MC[chatId] = undefined;
                botData.rent1BuyTransaction[chatId] = undefined;
                botData.rent1TokenAddress[chatId] = undefined;
            }
            opts = {
                chat_id: message.chat.id,
                message_id: message.message_id,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: `🟢 ${splitData[2]} | Time Left: ${membershipDate - 1}h 59m 🔮`,
                                callback_data: `bot_task_${taskId?.toString()}`
                            }
                        ],
                        [
                            {
                                text: 'Close',
                                callback_data: 'back_project'
                            }
                        ]
                    ],
                }
            };
        } else {
            const taskInfo = await getTasks(message.chat.id, botData.updateTaskId[message.chat.id]);
            const nowDate: any = new Date();
            console.log("nowdate ===>", nowDate.getDate());
            console.log("taskinfo endate ==>", taskInfo.endDate.getDate());
            const maxDate = taskInfo.endDate > nowDate ? taskInfo.endDate : nowDate;
            if (taskInfo.endDate < nowDate)
                taskInfo.endDate = nowDate;
            taskInfo.endDate.setHours(maxDate.getHours() + membershipDate);
            await updateTask(message.chat.id, botData.updateTaskId[message.chat.id], 'endDate', taskInfo.endDate);
            const temp: any = new Date();
            const timeDifference = taskInfo.endDate - temp;
            const hours = Math.max(0, Math.floor(timeDifference / (1000 * 60 * 60)));
            const minutes = Math.max(0, Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)));

            newText = `✅ Success!\n\n` + `Your ${taskInfo.name} Wallet:\n` + `<code>${taskInfo.taskWallet.address}</code>\n\n` +
                `🔮Just send ${taskInfo.name} tokens to the wallet above, and the bot will start automatically!\n\n` +
                "Private key:\n" + `<code>${taskInfo.taskWallet.privateKey}</code>`;

            opts = {
                chat_id: message.chat.id,
                message_id: message.message_id,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: `🟢 ${taskInfo.name} | Time Left: ${hours}h ${minutes}m 🔮`,
                                callback_data: `bot_task_${botData.updateTaskId[message.chat.id]?.toString()}`
                            }
                        ],
                        [
                            {
                                text: 'Close',
                                callback_data: 'back_project'
                            }
                        ]
                    ],
                }
            };
        }


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

export const membershipSuccessUI = (message: any, level: number, endTime: string) => {
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
                            callback_data: 'home'
                        }
                    ]
                ],
            }
        };
        let membership = null;

        if (level === 1) {
            membership = MEMBERSHIP_1;
        } else if (level === 2) {
            membership = MEMBERSHIP_2;
        } else if (level === 3) {
            membership = MEMBERSHIP_3;
        }

        if (membership) {
            const newText = `Congrats!🎊\n\n` +
                `You joined to ${membership.name} membership\n` +
                `Time: ${formatDateString(endTime)} (UTC)`;

            bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
                console.log("walletUI part:", error);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

export const membershipFailUI = (message: any) => {
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
                            callback_data: 'home'
                        }
                    ]
                ],
            }
        };

        const newText = `Failed.\n\n` +
            `Please try later.`;

        bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
            console.log("walletUI part:", error);
        });
    } catch (err) {
        console.error(err);
    }
}

export const withdrawMainUI = async (message: TelegramBot.Message) => {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        const chatId = message.chat.id as number;
        const opts = {
            chat_id: message.chat.id,
            message_id: message.message_id,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '✏️ Edit Amount',
                            callback_data: 'edit_amount'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: '________'
                        }
                    ]
                ],
            }
        };
        let balance: any = "";
        if (userInfo?.wallet?.address) {
            balance = await getBalance(userInfo?.wallet?.address, SUI_TYPE);
            balance = balance?.totalBalance;
            balance = (parseFloat(balance) / Math.pow(10, SUI_DECIMAL) - 0.06).toFixed(2);
        }
        const newText = `Enter an address to withdraw ${botData.withDrawAmount[chatId] == undefined ? balance : botData.withDrawAmount[chatId]} SUI\n\n`;

        // if (editable) {
        //     bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
        //         console.log("walletUI part:", error);
        //     });
        // } else {
        bot.sendMessage(message.chat.id, newText, opts as SendMessageOptions).catch((error) => {
            console.log("walletUI part:", error);
        });

        botStatus.otherStatus[chatId] = BotStatusInterface.InputWithdrawAddress;
        // }
    } catch (err) {
        console.error(err)
    }
}

export const confirmationMainUI = async (message: TelegramBot.Message) => {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
        const chatId = message.chat.id as number;
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
                            callback_data: 'confirm_withdraw'
                        }
                    ],
                    [
                        {
                            text: '← Back',
                            callback_data: 'withdraw'
                        }
                    ]
                ],
            }
        };
        let balance: any = "";
        if (userInfo?.wallet?.address) {
            balance = await getBalance(userInfo?.wallet?.address, SUI_TYPE);
            balance = balance?.totalBalance;
            balance = (parseFloat(balance) / Math.pow(10, SUI_DECIMAL) - 0.06).toFixed(2);
        }
        let newText: string = "";
        if (parseFloat(balance) <= 0.07) {
            await ProfitUI.InputSimpleUI(message, "No balance in your main wallet.", false);
            return;
        } else {
            newText = "Please confirm the transaction\n\n" + `Amount: ${botData.withDrawAmount[chatId] == undefined ? balance : botData.withDrawAmount[chatId]} SUI\n\n`
                + "From :  💳 /wallet\n" + `To: ${botData.withDrawAddress[chatId] != undefined ? botData.withDrawAddress[chatId] : "Not configured"}`;
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

export const confirmingUI = async (message: TelegramBot.Message) => {
    try {
        const userInfo = await getUserInfo(message.chat.id, message.chat.username);
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
        let balance: any = "";
        if (userInfo?.wallet?.address) {
            balance = await getBalance(userInfo?.wallet?.address, SUI_TYPE);
            balance = balance?.totalBalance;
            balance = (parseFloat(balance) / Math.pow(10, SUI_DECIMAL) - 0.06).toFixed(2);
        }
        ProfitUI.InputSimpleUI(message, "⏳ Sending transaction…", false);

        let digest: any;
        const sendAmount = botData.withDrawAmount[chatId] == undefined ? balance : (parseFloat(botData.withDrawAmount[chatId]) - 0.05).toFixed(2);
        console.log("sendAmount ===>", sendAmount);
        if (userInfo.wallet?.privateKey && botData.withDrawAddress[chatId] != undefined)
            digest = await sendToken(botData.withDrawAddress[chatId], userInfo.wallet?.privateKey, BigInt(parseFloat(sendAmount) * Math.pow(10, SUI_DECIMAL)));

        const newText = "✅ Transaction successful!" + `[View on Explorer](https://suiscan.xyz/mainnet/tx/${digest})` + "\n\n" + `Amount: ${botData.withDrawAmount[chatId] == undefined ? balance : botData.withDrawAmount[chatId]} SUI\n\n`
            + "From :  💳 /wallet\n" + `To: ${botData.withDrawAddress[chatId] != undefined ? botData.withDrawAddress[chatId] : "Not configured"}`;

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