import { EventId, SuiClient } from '@mysten/sui/client';
import { POLLING_INTERVAL_MS,MAX_EVENTS_PER_QUERY } from '../config/constants';
import { checkPoolType } from './poolServices';
import dotenv from 'dotenv';

dotenv.config();

// export async function monitorSpecificTokenSwapEvents(
//   client: SuiClient,
//   tokenInType: string,
//   amountThreshold: bigint,
//   callback: (poolAddress: string) => void,
//   cursor: EventId | null = null
// ) {
//   const filter = {
//     MoveEventType: `${process.env.CETUS_PACKAGE_ID}::pool::SwapEvent`,
//   };

//   while (true) {
//     try {
//       const { data, nextCursor } = await client.queryEvents({
//         query: filter,
//         cursor,
//         order: 'descending',
//         limit: MAX_EVENTS_PER_QUERY,
//       });

//       console.log('Checking for recent swap events...');

//       for (const event of data) {
//         const { atob, pool, amount_in, amount_out } = event.parsedJson as {
//           atob: boolean,
//           pool: string,
//           amount_in: string,
//           amount_out: string,
//         };

//         if (amount_out && await checkPoolType(pool, tokenInType)) {
//           const amountIn = BigInt(amount_in);
          
//           if (amountIn >= amountThreshold) {
//             const date = new Date(Number(event.timestampMs) || 0);
//             console.log("Local Time:", date.toDateString());
//             console.log(`Amount sold: ${amount_in}`);
//             callback(pool);
//           }
//         }
//       }

//       cursor = data[0]?.id ?? cursor;
//     } catch (error) {
//       console.error('Error fetching Cetus swap events:', error);
//     } finally {
//       await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
//     }
//   }
// }

