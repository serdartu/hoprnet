import { HoprDB } from './db'
import { randomBytes } from 'crypto'

import assert from 'assert'
import {
  UnacknowledgedTicket,
  Ticket,
  AcknowledgedTicket,
  Address,
  Balance,
  Hash,
  UINT256,
  HalfKey,
  Response,
  HalfKeyChallenge,
  ChannelEntry
} from './types'
import BN from 'bn.js'

function createMockedTicket() {
  return Ticket.create(
    new Address(randomBytes(Address.SIZE)),
    new Response(Uint8Array.from(randomBytes(32))).toChallenge(),
    UINT256.fromString('0'),
    UINT256.fromString('0'),
    new Balance(new BN(0)),
    UINT256.fromProbability(1),
    UINT256.fromString('1'),
    randomBytes(32)
  )
}

function createMockedChannelEntry() {
  return ChannelEntry.deserialize(new Uint8Array({ length: ChannelEntry.SIZE }).fill(1))
}

describe(`database tests`, function () {
  let db: HoprDB

  beforeEach(function () {
    db = HoprDB.createMock()
  })
  afterEach(async function () {
    await db.close()
  })

  it('hasPacket', async function () {
    const packetTag = randomBytes(5)

    const present = await db.checkAndSetPacketTag(packetTag)

    assert(present == false, `Packet tag must not be present`)

    const secondTry = await db.checkAndSetPacketTag(packetTag)

    assert(secondTry == true, `Packet tag must be set`)
  })

  it('ticket workflow', async function () {
    // this comes from a Packet
    const halfKeyChallenge = new HalfKeyChallenge(Uint8Array.from(randomBytes(HalfKeyChallenge.SIZE)))
    const unAck = new UnacknowledgedTicket(
      createMockedTicket(),
      new HalfKey(Uint8Array.from(randomBytes(HalfKey.SIZE)))
    )
    await db.storeUnacknowledgedTicket(halfKeyChallenge, unAck)
    assert((await db.getTickets()).length == 1, `DB should find one ticket`)

    const ticket = await db.getUnacknowledgedTicket(halfKeyChallenge)
    assert(ticket != null)

    const ack = new AcknowledgedTicket(
      ticket.ticket,
      new Response(Uint8Array.from(randomBytes(Hash.SIZE))),
      new Hash(Uint8Array.from(randomBytes(Hash.SIZE)))
    )
    await db.replaceUnAckWithAck(halfKeyChallenge, ack)

    assert((await db.getTickets()).length == 1, `DB should find one ticket`)
    assert((await db.getUnacknowledgedTickets()).length === 0, `DB should not contain any unacknowledgedTicket`)
    assert((await db.getAcknowledgedTickets()).length == 1, `DB should contain exactly one acknowledged ticket`)
  })

  it('block number workflow', async function () {
    const initialBlockNumber = await db.getLatestBlockNumber()

    assert(initialBlockNumber == 0, `initial block number must be set to 0`)

    const blockNumber = new BN(23)
    await db.updateLatestBlockNumber(blockNumber)

    const latestBlockNumber = await db.getLatestBlockNumber()

    assert(blockNumber.eqn(latestBlockNumber), `block number must be updated`)
  })

  it('should store ChannelEntry', async function () {
    const channelEntry = createMockedChannelEntry()

    await db.updateChannel(channelEntry.getId(), channelEntry)

    assert(!!(await db.getChannel(channelEntry.getId())), 'did not find channel')
    assert((await db.getChannels()).length === 1, 'did not find channel')
  })
})