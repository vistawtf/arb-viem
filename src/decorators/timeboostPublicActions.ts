import type { PublicClient } from 'viem'

import { getActiveAuction } from '../actions/public/auction/getActiveAuction.js'
import { getBiddingToken } from '../actions/public/auction/getBiddingToken.js'
import { getExpressLaneController } from '../actions/public/auction/getExpressLaneController.js'
import { getReservePrices } from '../actions/public/auction/getReservePrices.js'
import { getRoundTimingInfo } from '../actions/public/auction/getRoundTimingInfo.js'
import { getTvl } from '../actions/public/auction/getTvl.js'
import { getUserBalance } from '../actions/public/auction/getUserBalance.js'
import { getWithdrawalQueue } from '../actions/public/auction/getWithdrawalQueue.js'
import { validateBid } from '../actions/public/auction/validateBid.js'
import { getTimeboostedTxHashes } from '../actions/public/sequencer/getTimeboostedTxHashes.js'
import { streamTimeboostedTxs } from '../actions/public/sequencer/streamTimeboostedTxs.js'

export function timeboostPublicActions(client: PublicClient) {
  return {

    getActiveAuction: () => getActiveAuction(client),
    getBiddingToken: () => getBiddingToken(client),
    getExpressLaneController: () => getExpressLaneController(client),
    getReservePrices: () => getReservePrices(client),
    getRoundTimingInfo: () => getRoundTimingInfo(client),
    getTvl: () => getTvl(client),
    getUserBalance: (
      userAddress: Parameters<typeof getUserBalance>[1],
    ) => getUserBalance(client, userAddress),
    getWithdrawalQueue: (
      args: Parameters<typeof getWithdrawalQueue>[1],
    ) => getWithdrawalQueue(client, args),
    validateBid: (
      userAddress: Parameters<typeof validateBid>[1],
      bidAmount: Parameters<typeof validateBid>[2],
    ) => validateBid(client, userAddress, bidAmount),
    getTimeboostedTxHashes: (
      args: Parameters<typeof getTimeboostedTxHashes>[1],
    ) => getTimeboostedTxHashes(client, args),
    streamTimeboostedTxs: (
      args: Parameters<typeof streamTimeboostedTxs>[1],
    ) => streamTimeboostedTxs(client, args),
  }
} 