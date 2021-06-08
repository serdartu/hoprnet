import { networkInterfaces, NetworkInterfaceInfo } from 'os'
import { isLinkLocaleAddress, nodeToMultiaddr } from './utils'
import { Multiaddr } from 'multiaddr'
import Debug from 'debug'
const log = Debug('hopr-connect')

import { isLocalhost, ipToU8aAddress, isPrivateAddress } from './utils'

type AddrOptions = {
  interface?: string
  useIPv4?: boolean
  useIPv6?: boolean
  includePrivateIPv4?: boolean
  includeLocalhostIPv4?: boolean
  includeLocalhostIPv6?: boolean
}

function validateOptions(opts?: AddrOptions) {
  if (opts == undefined) {
    return
  }
  if (opts.useIPv4 == false && (opts.includePrivateIPv4 || opts.includeLocalhostIPv4)) {
    throw Error(`Contradiction in opts. Cannot add private or local IPv4 address if IPv4 is disabled.`)
  }

  if (opts.useIPv6 == false && opts.includeLocalhostIPv6) {
    throw Error(`Contradiction in opts. Cannot add private or local IPv4 address if IPv4 is disabled.`)
  }
}

function getAddrsOfInterface(iface: string) {
  let ifaceAddrs = networkInterfaces()[iface]

  if (ifaceAddrs == undefined) {
    log(
      `Interface <${iface}> does not exist on this machine. Available are <${Object.keys(networkInterfaces()).join(
        ', '
      )}>`
    )
    return []
  }

  return ifaceAddrs
}

export function getAddrs(
  port: number,
  peerId: string,
  options?: AddrOptions,
  __fakeInterfaces?: ReturnType<typeof networkInterfaces>
) {
  validateOptions(options)

  let interfaces: (NetworkInterfaceInfo[] | undefined)[]

  if (options?.interface) {
    interfaces = [getAddrsOfInterface(options.interface)]
  } else {
    interfaces = Object.values(__fakeInterfaces ?? networkInterfaces())
  }

  const multiaddrs: Multiaddr[] = []

  for (const iface of interfaces) {
    if (iface == undefined) {
      continue
    }

    for (const address of iface) {
      const u8aAddr = ipToU8aAddress(address.address, address.family)

      if (isLinkLocaleAddress(u8aAddr, address.family)) {
        continue
      }

      if (isPrivateAddress(u8aAddr, address.family)) {
        if (address.family === 'IPv4' && (options == undefined || options.includePrivateIPv4 != true)) {
          continue
        }
      }

      if (isLocalhost(u8aAddr, address.family)) {
        if (address.family === 'IPv4' && (options == undefined || options.includeLocalhostIPv4 != true)) {
          continue
        }
        if (address.family === 'IPv6' && (options == undefined || options.includeLocalhostIPv6 != true)) {
          continue
        }
      }

      if (address.family === 'IPv4' && options != undefined && options.useIPv4 != true) {
        continue
      }

      if (address.family === 'IPv6' && options != undefined && options.useIPv6 != true) {
        continue
      }

      multiaddrs.push(
        Multiaddr.fromNodeAddress(nodeToMultiaddr({ ...address, port }), 'tcp').encapsulate(`/p2p/${peerId}`)
      )
    }
  }

  return multiaddrs
}
