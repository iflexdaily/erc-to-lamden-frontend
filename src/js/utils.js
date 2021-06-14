import { ethStore, web3, connected, selectedAccount } from "svelte-web3";
import WalletController from "./LamdenWalletController"
import { projectConf } from "../conf";
import { vk, ethBalance, lamden_origin, tauBalance, lwc, connected_lwc, message, resume_burn, eth_token_balance, lamden_token_balance } from "../stores/lamden";
import { get } from "svelte/store";
import BN from "bignumber.js";
import { startBurn, resumeBurn } from './lamdenToEth_helpers'
import { startSwap } from './ethToLamden_helpers'
let conf = projectConf["testnet"];

export default connected;

export let handleMetaMaskError = function(walletConnected) {
  let errorListener;
  let errorMessageg;
  let errorHandler = function(event) {
    errorMessage = event.detail
  }
  if (!walletConnected && !errorListener) {
    //document.addEventListener('metamaskError', (e) => errorHandler(e));
    errorListener = true
  }
  else {
    if (errorListener) {
      //document.removeEventListener('metamaskError', (e) => errorHandler(e))
    }
  }
  if (errorMessage) {
    return errorMessage
  }
}

async function connectMetamask(event) {
  let metamaskError;
  try {
    await ethStore.setBrowserProvider();
  } catch (error) {
    console.log(metamaskError)
    if (error.code === -32002) {
      metamaskError =
        "Please open metamask and accept the connection request.";
    } else if (error.code === 4001) {
      metamaskError = "Request Rejected.";
    } else {
      metamaskError = "Something went wrong.";
    }
  }
  if (metamaskError) {
    const error = new CustomEvent('metamaskError', { detail: metamaskError });
    dispatchEvent(error)
  }
}

function connect_lamden_wallet() {
  let lamdenWallet = get(lwc)
  if (lamdenWallet && !lamdenWallet.locked) {
    lamdenWallet.sendConnection(
      //projectConf[$currentNetwork].lamden.clearingHouse
      projectConf["testnet"].lamden.clearingHouse
    );
    connected_lwc.set(true)
  }
  
}

export const connect_metamask_button = {
  title: "CONNECT METAMASK",
  clicked: connectMetamask,
};

export const connect_lamden_wallet_button = {
  title: "CONNECT LAMDEN WALLET",
  clicked: connect_lamden_wallet,
};

export const checkForLamdenWallet = async () => {
  let controller = new WalletController();
  let walletInstalled;

  await controller.walletIsInstalled().then((installed) => {
    if (installed) {
      walletInstalled = true
    }
    else {
      console.log('install wallet')
    }
  });
  console.log(controller)

};

export const checkEthTxStatus = async (txHash, web3) => {
  console.log({checking: txHash})
  try{
      let response =  await web3.eth.getTransactionReceipt(txHash)
      console.log(response)
      return response
  } catch (e) {}
  return false
}

export const checkEthTransactionUntilResult = async (txHash, web3, resolver) => {
  let txHashInfo = await checkEthTxStatus(txHash, web3)
  if (!txHashInfo || !txHashInfo.status) setTimeout(() => checkEthTransactionUntilResult(txHash, web3, resolver), 5000)
  else resolver(txHashInfo)
}

export function setNetwork(direction, from_lamden) {
  let origin;
  let destination;
  if (from_lamden) {
    origin = 'Lamden'
    destination = 'Ethereum'
    checkTokenBalanceFunction.set(checkLamdenTokenBalance)
  }
  else {
    origin = 'Ethereum'
    destination = 'Lamden'
    checkTokenBalanceFunction.set(checkEthereumTokenBalance)
  }
  if (direction == 'from') return origin
  else return destination
  
}

export function checkChain(current) {
  if (current.chainId !== conf.ethereum.chainId) {
    message.set(`Switch Metamask to ${conf.ethereum.networkName}.`);
    return;
  }
  let msg = get(message)
  if (
    current.chainId === conf.ethereum.chainId &&
    msg === `Switch Metamask to ${conf.ethereum.networkName}.`
  ) {
    message.set("");
  }
}

export async function checkETHBalance() {
  let latest_selectedAccount = get(selectedAccount)
  if (!latest_selectedAccount) return;
  let latest_web3 = get(web3)
  await latest_web3.eth.getBalance(latest_selectedAccount).then((res) => {
    ethBalance.set(new BN(latest_web3.utils.fromWei(res, "ether")));
  });
}

export async function checkLamdenBalance() {
  let latest_vk = get(vk)
  if (!latest_vk) return;
  try {
    const res = await fetch(
      `${conf.lamden.network.apiLink}/states/currency/balances/${latest_vk}`,
      {
        method: "GET",
      }
    );
    if (res.status === 200) {
      const value = (await res.json()).value;
      if (value) {
        if (value.__fixed__) tauBalance.set(new BN(value.__fixed__));
        else tauBalance.set(new BN(value));
      } else {
        tauBalance.set(new BN(0));
      }
    }
  } catch (error) {
    tauBalance.set(new BN(0));
  }
}


export let network_to = function(from_lamden) {
  if (from_lamden) return 'Ethereum'
  else return 'Lamden'
}
export let network_from = function(from_lamden) {
  if (from_lamden) return 'Lamden'
  else return 'Ethereum'
}

export let set_swap_func = function(from_lamden) {
  if (get(resume_burn)) {
    return resumeBurn
  }
  else {
    if (from_lamden) return startBurn
    else return startSwap
  }
}

export const handleInput = (e) => {
  e.target.setCustomValidity("");
  e.target.value = e.target.value
  .replace(/[^0-9.]/g, "")
  .replace(/(\..*)\./g, "$1");
};
export const handleInvalid = (e) =>
  e.target.setCustomValidity("A number is required");

export const handleTxHashInput = (e) => e.target.setCustomValidity('')
export const handleTxHashInvalid = (e) => e.target.setCustomValidity('Invalid Lamden Transaction Hash')

let tokenName = null;
export async function checkEthereumTokenBalance(selected_token) {
  if (selected_token) {
    tokenName = selected_token;
    const token = conf.ethereum.tokens
      .filter((t) => t.name === tokenName)
      .pop();
      let latest_web3 = get(web3)


    try {
      let latest_selectedAccount = get(selectedAccount)

      const erc20TokenContract = new latest_web3.eth.Contract(
        token.abi,
        token.address
      );
      const val = await erc20TokenContract.methods
        .balanceOf(latest_selectedAccount)
        .call();
      if (val) {
        eth_token_balance.set(new BN(latest_web3.utils.fromWei(val, "ether")));
      } else {
        eth_token_balance.set(new BN(0));
      }
      console.log(erc20TokenContract);
      console.log(token);
    } catch (error) {
      console.log(error);
    }
  }
}

export async function checkLamdenTokenBalance(selected_token) {
  if (selected_token) {
    console.log("test");
    tokenName = selected_token;
    const token = conf.ethereum.tokens
      .filter((t) => t.name === tokenName)
      .pop();
    try {
      const res = await fetch(
        `${conf.lamden.network.apiLink}/states/${conf.lamden.token.contractName}/balances/${$vk}`,
        {
          method: "GET",
        }
      );
      console.log(res);
      if (res.status === 200) {
        const value = (await res.json()).value;
        if (value) {
          if (value.__fixed__) lamden_token_balance.set(new BN(value.__fixed__));
          else lamden_token_balance.set(new BN(value));
        } else {
          lamden_token_balance.set(new BN(0));
        }
      }
    } catch (error) {
      lamden_token_balance.set(new BN(0));
    }
  } else {
    tokenName = "";
  }
}