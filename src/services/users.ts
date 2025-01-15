import { ObjectId } from "mongodb";
import UserModel from '../models/users.models';

import { createNewSuiWallet, NewWallet } from './wallets';
import { MEMBERSHIP_1, MEMBERSHIP_2, MEMBERSHIP_3, SUI_DECIMAL } from "../config/constants";
import { sendToken } from "./tokenUtils";

export const getUserInfo = async (userId: number, username?: string) => {
    try {
        const user = await UserModel.findOne({ userId });

        if (user) {
            return user;
        } else {
            const newWallet = createNewSuiWallet();
            const newUser = new UserModel({
                userId: userId,
                username: username,
                wallet: newWallet,
                tasks: [],
                referral: {
                    parent1: 0,
                    parent2: 0,
                    parent3: 0,
                    parent4: 0,
                    parent5: 0,
                    isLink: false
                }
            });
            await newUser.save();

            return newUser;
        }
    } catch (err) {
        throw err;
    }
}

export const updateRefferal = async (userId: number, refferalId?: number, username?: string) => {
    try {
        let refferalUser: any = null;

        if (refferalId) {
            refferalUser = await UserModel.findOne({ userId: refferalId });
        }

        if (!refferalId && username) {
            refferalUser = await UserModel.findOne({ username: username.substring(1) });
        }
        console.log('refferalUser = ', refferalUser);

        if (refferalUser) {
            await UserModel.updateOne(
                { userId },
                {
                    referral: {
                        parent1: refferalId ? refferalId : refferalUser.userId,
                        parent2: refferalUser.referral?.parent1,
                        parent3: refferalUser.referral?.parent2,
                        parent4: refferalUser.referral?.parent3,
                        parent5: refferalUser.referral?.parent4,
                        isLink: refferalId ? true : false
                    }
                }
            )

            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}


export const addNewtask = async (userId: number, name: string, tokenAddress: string, percent: number, minAmount: number, membershipLevel : number, newTaskWallet : NewWallet) => {
    try {
        const user = await UserModel.findOne({ userId });
        console.log("membership level ===>", membershipLevel);
        console.log("new wallet ===>", newTaskWallet);
        if (!user) {
            throw new Error(`User with ID ${userId} not found.`);
        }
        let membershipDate : number = 0;
        switch(membershipLevel) {
            case 1:
                membershipDate = MEMBERSHIP_1.date;
                break;
            case 2:
                membershipDate = MEMBERSHIP_2.date;
                break;
            case 3:
                membershipDate = MEMBERSHIP_3.date;
                break;
            default:
                break;
        }

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + membershipDate);
        const tradingWallet : Array<Object> = [newTaskWallet];
        for(let i = 0; i < 4; i++) {
            tradingWallet.push(createNewSuiWallet());
        }

        for(let i = 0; i < 5; i++) {
            await sendToken((tradingWallet[i] as any).address, process.env.COMPANY_WALLET_PRIVATE as any, BigInt(0.1 * Math.pow(10, SUI_DECIMAL)));
        }

        user.tasks.push({
            name,
            percent,
            minAmount,
            tokenAddress,
            endDate,
            taskWallet : newTaskWallet,
            tradingWallet : newTaskWallet,
            tradingWalletList : tradingWallet,
            marketCap : "0",
            everyBuy : 2
        });

        await user.save();

        return user;
    } catch (err) {
        throw err;
    }
}

export const deleteTasks = async (userId: number, taskId: string) => {
    try {
        const result = await UserModel.updateOne(
            { userId },
            {
                $pull: {
                    tasks: { _id: new ObjectId(taskId) } // Match the task by _id
                }
            }
        );

        return true;
    } catch (err) {
        throw err;
    }
}


export const getTasks = async (userId: number, taskId: string) => {
    try {
        console.log('====================================');
        console.log('userId, taskId = ', userId, taskId);
        console.log('====================================');
        const result = await UserModel.aggregate([
            {
                $match: { userId: userId }
            },
            {
                $unwind: '$tasks'
            },
            {
                $match: { 'tasks._id': new ObjectId(taskId) }
            }
        ]);

        if (result.length === 0) {
            return null
        }

        const task = result[0].tasks;
        return task;
    } catch (err) {
        throw err;
    }
}

export const updateTask = async (userId: number, taskId: string, key: any, value: any) => {
    try {
        const result = await UserModel.updateOne(
            {
                userId, // Match the user by userId
                'tasks._id': new ObjectId(taskId) // Match the task by _id
            },
            {
                $set: { [`tasks.$[task].${key}`]: value } // Update the name field in the matching task
            },
            {
                arrayFilters: [{ 'task._id': new ObjectId(taskId) }] // Filter the task to update
            }
        );

        console.log(result);
    } catch (err) {
        throw err;
    }
}

export const addMembershipHistory = async (userId: number, level: number, endTime: string) => {
    try {
        const user = await UserModel.findOne({ userId });

        if (!user) {
            throw new Error(`User with ID ${userId} not found.`);
        }

        user.membershipHistory.push({
            level: level,
            endTime: endTime,
        });

        await user.save();

        return user;
    } catch (err) {
        throw err;
    }
}