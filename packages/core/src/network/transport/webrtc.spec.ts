import myHandshake from './handshake'
import pushable from 'it-pushable'
import pipe from 'it-pipe'
import upgradeToWebRtc from './webrtc'
import { randomBytes } from 'crypto'
import assert from 'assert'
import { u8aEquals } from '@hoprnet/hopr-utils'
import toIterable = require('stream-to-it')
import Pair = require('it-pair')
import {once} from 'events'

describe('test webRTC upgrade with custom handshake', function () {
  it('should use the extended stream and use it to feed WebRTC', async function () {
    const AliceBob = Pair()
    const BobAlice = Pair()

    const webRTCsendAlice = pushable<Uint8Array>()
    const webRTCrecvAlice = pushable<Uint8Array>()

    const webRTCsendBob = pushable<Uint8Array>()
    const webRTCrecvBob = pushable<Uint8Array>()

    const streamAlice = myHandshake(webRTCsendAlice, webRTCrecvAlice)
    const streamBob = myHandshake(webRTCsendBob, webRTCrecvBob)

    pipe(
      // prettier-ignore
      BobAlice.source,
      streamAlice.webRtcStream.source
    )

    pipe(
      // prettier-ignore
      streamBob.webRtcStream.sink,
      BobAlice.sink
    )

    pipe(
      // prettier-ignore
      AliceBob.source,
      streamBob.webRtcStream.source
    )

    pipe(
      // prettier-ignore
      streamAlice.webRtcStream.sink,
      AliceBob.sink
    )

    const [preChannelAlice, preChannelBob] = await Promise.all([
      upgradeToWebRtc(webRTCsendAlice, webRTCrecvAlice, { initiator: true }),
      upgradeToWebRtc(webRTCsendBob, webRTCrecvBob),
    ])

    const [channelAlice, channelBob] = [preChannelAlice, preChannelBob].map(toIterable.duplex)

    let messageForBobReceived = false
    const messageForBob = randomBytes(41)

    let messageForAliceReceived = false
    const messageForAlice = randomBytes(23)

    const pipeAlicePromise = pipe(
      // prettier-ignore
      [messageForBob],
      channelAlice,
      async (source: AsyncIterable<Uint8Array>) => {
        for await (const msg of source) {
          if (u8aEquals(msg, messageForAlice)) {
            messageForAliceReceived = true
          }
        }
      }
    )

    const pipeBobPromise = pipe(
      // prettier-ignore
      [messageForAlice],
      channelBob,
      async (source: AsyncIterable<Uint8Array>) => {
        for await (const msg of source) {
          if (u8aEquals(msg, messageForBob)) {
            messageForBobReceived = true
          }
        }
      }
    )

    await Promise.all([pipeAlicePromise, pipeBobPromise])

    webRTCsendAlice.end()
    webRTCsendBob.end()
    webRTCrecvAlice.end()
    webRTCrecvBob.end()

    preChannelAlice.destroy()
    preChannelBob.destroy()
    await once(preChannelAlice, 'close')
    await once(preChannelBob, 'close')

    assert(messageForBobReceived && messageForAliceReceived, `Alice and Bob should have received the right message`)
  })
  
  afterAll(async () => {
    // Wait for sockets to clear
    await new Promise((resolve) => setTimeout(resolve, 1000))
  })
})
