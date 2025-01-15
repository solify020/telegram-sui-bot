import { model, Schema } from 'mongoose';

const PoolsSchema = new Schema({
    dexName: {
        type: String,
        require: true
    },
    poolAddress: {
        type: String,
        require: true
    },
    poolType: {
        type: String,
        require: true
    },
    coinTypeA: {
        type: String,
        require: true
    },
    coinTypeB: {
        type: String,
        require: true
    }
}, {
    strict: false,
    timestamps: true
});

const Pools = model('pools', PoolsSchema);

export default Pools;
