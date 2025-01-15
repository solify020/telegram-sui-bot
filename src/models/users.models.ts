import { model, Schema } from 'mongoose';

const UserSchema = new Schema({
    userId: {
        type: Number,
        require: true
    },
    username: {
        type: String,
        require: true
    },
    wallet: {
        address: String,
        publicKey: String,
        privateKey: String
    },
    tasks: [{
        name: String,
        percent: Number,
        minAmount: Number,
        tokenAddress: String,
        endDate : Date,
        marketCap : String,
        everyBuy : Number,
        status: {
            type: Boolean,
            default: false
        },
        taskWallet : {
            address: String,
            publicKey: String,
            privateKey: String
        },
        tradingWallet : {
            address: String,
            publicKey: String,
            privateKey: String
        },
        tradingWalletList : [{
            address: String,
            publicKey: String,
            privateKey: String
        }],
    }],
    referral: {
        parent1: Number,
        parent2: Number,
        parent3: Number,
        parent4: Number,
        parent5: Number,
        isLink: Boolean
    },
    membershipHistory: [{
        level: Number,
        endTime: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    strict: false,
    timestamps: true
});

const User = model('user', UserSchema);

export default User;
