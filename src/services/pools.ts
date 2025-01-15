import mongoose from 'mongoose';
import PoolsModel from '../models/pools.models';


export const addPoolsInfo = async (poolAddress: string, poolType: string, coinTypeA: string, coinTypeB: string, coinAmountB: number, coinAmountA: number, current_sqrt_price: number, current_tick_index: number, fee_growth_global_a: number, fee_growth_global_b: number, fee_protocol_coin_a: number, fee_protocol_coin_b: number, fee_rate: number, is_pause: Boolean, liquidity: number, positions_handle: string, position_size: number, rewarder_infos: any, rewarder_last_updated_time: String, tickSpacing: String, ticks_handle: string, uri: string, index: number, name: string) => {
    try {
        const newPool = new PoolsModel({
            poolAddress,
            poolType,
            coinTypeA,
            coinTypeB,
            coinAmountB,
            coinAmountA,
            current_sqrt_price,
            current_tick_index,
            fee_growth_global_a,
            fee_growth_global_b,
            fee_protocol_coin_a,
            fee_protocol_coin_b,
            fee_rate,
            is_pause,
            liquidity,
            position_manager: {
                positions_handle,
                size: position_size
            },
            rewarder_infos,
            rewarder_last_updated_time,
            tickSpacing,
            ticks_handle,
            uri,
            index,
            name
        });
        await newPool.save();
        return newPool;
    }
    catch (err) {
        throw err;
    }
}

export const insertPoolData = async (data: any) => {
    try {
        await PoolsModel.insertMany(data);
    } catch (err) {
        console.error(err);
    }
}

export const getPoolsInfo = async (tokenAddress: string) => {
    try {
        const result = await PoolsModel.findOne({
            $or: [
                { coinTypeA: { $regex: `${tokenAddress}`, $options: 'i' } },
                { coinTypeB: { $regex: `${tokenAddress}`, $options: 'i' } }
            ]
        });
        if (!result) {
            return null
        }
        return result;
    } catch (err) {
        throw err;
    }
}

export const getPools = async (tokenAddress: string) => {
    try {
        const result = await PoolsModel.find({
            $or: [
                { coinTypeA: tokenAddress },
                { coinTypeB: tokenAddress }
            ]
        });
        
        if (result.length) {
            return result;
        }

        return null
    } catch (err) {
        throw err;
    }
}

export async function checkCollectionExists(del: boolean) {

    const collections = await mongoose.connection.db?.listCollections().toArray();
    const exit = collections?.some(collection => collection.name === 'pools');

    if (exit) {
        if (del) {
            await PoolsModel.collection.drop();
            return true;
        }
        else return true;
    } else {
        return false;
    }
} 