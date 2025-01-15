import 'dotenv/config'
import path from 'path';
import { promises as fs } from 'fs';
import { EditMessageCaptionOptions, SendMessageOptions } from 'node-telegram-bot-api';

import { bot } from '../bot';

export async function volumeMainUI(message: any) {
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
                            text: 'Deposit',
                            callback_data: 'select_coin_deposit'
                        },
                        {
                            text: 'Withdraw',
                            callback_data: 'select_coin_withdraw'
                        }
                    ],
                    [
                        {
                            text: 'Show Private',
                            callback_data: 'show_private'
                        }
                    ],
                    [
                        {
                            text: '< Back to Wallet',
                            callback_data: 'wallet_back'
                        }
                    ]
                ],
            }
        };
        const newText = `<strong><i>🖇 Managing your wallet for your Telegram Giveaway Bot🔥\n\n </i></strong>` +
            `♻️ Manage your wallet. ♻️\n\n`;
        bot.editMessageText(newText, opts as EditMessageCaptionOptions).catch((error) => {
            console.log("walletUI part:", error);
        }); 
    } catch(err) {
        console.error(err);
    }
}