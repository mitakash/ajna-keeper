import { providers } from "ethers";

export function getTime() {
  /** Time since Epoch in seconds */
  return Date.now() / 1000;
  // return (await provider.getBlock('latest')).timestamp
}