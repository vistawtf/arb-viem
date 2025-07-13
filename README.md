<br/>

<p align="center">
  <h1>ARB Viem</h1>
</p>

<p align="center">
  Viem Extension for Arbitrum
<p>

<br>

## Installation

```bash
npm install arb-viem
```

## Quick Start

### 1. Setting up Clients

```ts
import { createPublicClient, createWalletClient, http } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import { timeboostPublicActions, timeboostWalletActions } from 'arb-viem'

// Public client for reading auction/sequencer data
const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http()
}).extend(timeboostPublicActions)

// Wallet client for bidding and submitting transactions
const walletClient = createWalletClient({
  chain: arbitrumSepolia,
  transport: http(),
  account: yourAccount
}).extend(timeboostWalletActions)
```

### 2. Monitoring Auctions

```ts
// Get current auction information
const activeAuction = await publicClient.getActiveAuction()
console.log(`Current round: ${activeAuction.currentRound}`)
console.log(`Auction open: ${!activeAuction.isAuctionClosed}`)

// Check minimum bid amounts
const reservePrices = await publicClient.getReservePrices()
console.log(`Min reserve price: ${reservePrices.minReservePrice}`)

// Monitor your balance
const balance = await publicClient.getUserBalance({
  user: '0x742d35Cc6634C0532925a3b8D91C13a5E8b1b09D'
})
```

### 3. Participating in Auctions

```ts
// Submit a bid for the next round
const bidResult = await walletClient.writeSubmitBid({
  args: {
    round: activeAuction.currentRound + 1n,
    expressLaneController: walletClient.account.address,
    amount: parseEther('0.5'), // Must be above reserve price
  }
})

if (bidResult.success) {
  console.log(`Bid submitted successfully: ${bidResult.bidHash}`)
} else {
  console.error(`Bid failed: ${bidResult.error}`)
}
```

### 4. Using Express Lane (Controller Only)

```ts
// Only the current express lane controller can submit express lane transactions
const expressLaneController = await publicClient.getExpressLaneController({
  round: activeAuction.currentRound
})

if (expressLaneController.controller === walletClient.account.address) {
  const txHash = await walletClient.writeExpressLaneTransaction({
    args: {
      transaction: {
        to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        value: parseEther('0.1'),
        data: '0x...',
      },
      round: activeAuction.currentRound,
      sequenceNumber: 1n, // Optional: for ordering
    }
  })
  console.log(`Express lane transaction: ${txHash}`)
}
```

## API Reference

### Public Actions

| Action | Description |
|--------|-------------|
| `getActiveAuction()` | Get current auction round and status |
| `getReservePrices()` | Get minimum bid amounts |
| `getUserBalance(user)` | Get user's deposit balance |
| `getExpressLaneController(round)` | Get current express lane controller |
| `getBiddingToken()` | Get auction bidding token info |
| `getRoundTimingInfo()` | Get auction timing details |
| `getTvl()` | Get total value locked in auctions |
| `getWithdrawalQueue(user)` | Get pending withdrawals |
| `validateBid(params)` | Validate bid parameters |
| `streamTimeboostedTxs(params)` | Stream timeboost transactions |

### Wallet Actions

| Action | Description |
|--------|-------------|
| `writeSubmitBid(args)` | Submit bid for express lane controller |
| `writeExpressLaneTransaction(args)` | Submit transaction via express lane |

## Error Handling

### Auction Errors

```ts
const bidResult = await walletClient.writeSubmitBid({
  args: { round: 124n, expressLaneController: '0x...', amount: parseEther('0.1') }
})

if (!bidResult.success) {
  switch (bidResult.error) {
    case 'NOT_DEPOSITOR':
      console.log('You need to deposit funds first')
      break
    case 'RESERVE_PRICE_NOT_MET':
      console.log('Bid amount too low')
      break
    case 'INSUFFICIENT_BALANCE':
      console.log('Not enough deposited balance')
      break
    default:
      console.error('Bid failed:', bidResult.error)
  }
}
```

### Express Lane Errors

```ts
try {
  const txHash = await walletClient.writeExpressLaneTransaction({
    args: { transaction: {...}, round: 124n }
  })
} catch (error) {
  if (error.message.includes('NOT_EXPRESS_LANE_CONTROLLER')) {
    console.log('You are not the current express lane controller')
  } else if (error.message.includes('BAD_ROUND_NUMBER')) {
    console.log('Invalid round number')
  } else {
    console.error('Express lane transaction failed:', error.message)
  }
}
```

## Timeboost Protocol

[Timeboost](https://docs.arbitrum.io/how-arbitrum-works/timeboost) is Arbitrum's protocol for fair sequencing with express lanes. Key concepts:

- **Express Lane Controller**: The winning bidder who can submit transactions for immediate sequencing
- **Auction Rounds**: Regular auctions (every ~60 seconds) to determine the next express lane controller
- **Sequence Number**: Per-round ordering mechanism for express lane submissions
- **Reserve Price**: Minimum bid amount required to participate in auctions

## Supported Networks

- Arbitrum Sepolia Testnet
- Arbitrum One

## Contributing

If you're interested in contributing, please read the [contributing docs](CONTRIBUTING.md) **before submitting a pull request**.

## License

[MIT](LICENSE) License
