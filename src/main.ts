import express from 'express';
import 'dotenv/config';

import connectDB from './db';
import { processBot, tokenSwapManager } from './bot';

import { getTurbosSuiSwapPoolAddresses, startCron } from './services/poolServices';
import { getDecimal, sendMultiToken } from './services/tokenUtils';
import { getAllBalances, getBalance } from './services/wallets';
import { SUI_TYPE } from './config/constants';
import { turbosSwapToken } from './services/swapToken';
import { getTasks, updateTask } from './services/users';

const app = express();
const port = 5000;

connectDB().then(() => {
	app.listen(port, async () => {
		console.log(`Server running at port: ${port}`);

		// await turbosSwapToken('suiprivkey1qp06xh3u5c88ynqfzmgmh5q33504exk27yzchxkj8dvzyducecz6uhls9z6', 32109564184, '0xbd85f61a1b755b6034c62f16938d6da7c85941705d9d10aa1843b809b0e35582', '0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD');
		// await turbosSwapToken('suiprivkey1qp06xh3u5c88ynqfzmgmh5q33504exk27yzchxkj8dvzyducecz6uhls9z6', 10000, '0xbd85f61a1b755b6034c62f16938d6da7c85941705d9d10aa1843b809b0e35582', '0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD');

		// sendMultiToken([{receiver: '0x9d17233f797644f4d0c17ac1eac205037be82e27363e2cfb24412d47e70a6011', amount: BigInt('10000000')}, {receiver: '0x1da24e715b360f098c619379af629a1286b535f58a0fe458c5ccfeee1066e780', amount: BigInt('20000000')}], 'suiprivkey1qp06xh3u5c88ynqfzmgmh5q33504exk27yzchxkj8dvzyducecz6uhls9z6')

		console.log(new Date())
		await startCron();
		processBot();
		console.log(' ========== Bot is running... ========== ');

		// getDecimal('0x2::sui::SUI');

		// getTurbosSuiSwapPoolAddresses();

		// await getSuiSwapPoolAddress();
		// const balances = await getAllBalances('0xc535db98a9bb6ecfa31ed940c8c7567f95b6bb8c9ddf8bc84512af55add59143');
		// const balances = await getBalance('0xc535db98a9bb6ecfa31ed940c8c7567f95b6bb8c9ddf8bc84512af55add59143', SUI_TYPE);
		// console.log(balances);
	});

}).catch((err: any) => {
	console.log('Bot running failed.');
	console.error(err);
});

setInterval(async () => {
	console.log("token swap manager ===>", tokenSwapManager);
	for( const key in tokenSwapManager as Object) {
		const value = tokenSwapManager[key];
		const task = await getTasks(value.userId, value.taskId);
		const nowDate = new Date();
		if(task.endDate < nowDate) {
			await updateTask(value.userId, value.taskId , 'status', false);
			value.stop();
		}
	}
}, 120000)