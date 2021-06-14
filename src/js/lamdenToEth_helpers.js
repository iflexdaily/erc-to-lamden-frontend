import { projectConf } from "../conf";
import BN from "bignumber.js";
import {
  vk,
  ethBalance,
  lamden_origin,
  tauBalance,
  checkTokenBalanceFunction,
  lwc,
  lamdenApprovalTxHash,
  lamdenBurnTxHash,
  ethTxHash,
  success, message, status, isLoading
} from "../stores/lamden";
import { get } from "svelte/store";
import { web3, selectedAccount, chainData } from "svelte-web3";

let conf = projectConf["testnet"];

let tokenName = null;
let balance = new BN(0);
let approval = new BN(0);
let ethApprovalTxHash = { hash: "", success: false };
let ethDepositTxHash = { hash: "", success: false };


let newSwap = true;

ethTxHash.set({ hash: "", success: false });
lamdenApprovalTxHash.set({ hash: "", success: false });
lamdenBurnTxHash.set({ hash: "", success: false });

export async function checkTokenBalance(event) {
  if (event.target.value) {
    tokenName = event.target.value;
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
          if (value.__fixed__) balance = new BN(value.__fixed__);
          else balance = new BN(value);
        } else {
          balance = new BN(0);
        }
      }
    } catch (error) {
      balance = new BN(0);
    }
  } else {
    tokenName = "";
  }
}

async function checkApproval() {
  status.set("Checking for Approval...");
  try {
    const res = await fetch(
      `${conf.lamden.network.apiLink}/states/${conf.lamden.token.contractName}/balances/${$vk}:${conf.lamden.clearingHouse.contractName}`,
      {
        method: "GET",
      }
    ).catch((e) => console.log("ERROR"));
    if (res.status === 200) {
      const value = (await res.json()).value;
      if (value) {
        if (value.__fixed__) return new BN(value.__fixed__);
        else return new BN(value);
      } else {
        return new BN(0);
      }
    } else {
      return new BN(0);
    }
  } catch (error) {
    return new BN(0);
  }
}

const sendApproval = (amountToApprove) =>
  new Promise((resolve) => {
    status.set("Sending Lamden approval (check popup)...");
    const txInfo = {
      networkType: conf.lamden.clearingHouse.networkType,
      contractName: conf.lamden.token.contractName,
      methodName: "approve",
      kwargs: {
        amount: { __fixed__: amountToApprove.toFixed(18) },
        to: conf.lamden.clearingHouse.contractName,
      },
      stampLimit: conf.lamden.stamps.approval,
    };
    console.log(get(lwc));
    get(lwc).sendTransaction(txInfo, async (txResults) => {
      console.log(txResults);
      if (txResults.status === "Transaction Cancelled") {
        message.set("Transaction canceled by user.");
        resolve(false);
      }
      if (txResults.data) {
        if (txResults.data.txHash)
        lamdenApprovalTxHash.set({ hash: txResults.data.txHash, success: false });
    }
      if (txResults.status === "success") {
        let latest_lamdenApprovalTxHash = get(lamdenApprovalTxHash)
        try {
          status.set("Lamden approval sent...");
          lamdenApprovalTxHash.set({ hash: latest_lamdenApprovalTxHash.hash, success: true });
          resolve(true);
        } catch (error) {
          message.set("Transaction failed");
          lamdenApprovalTxHash.set({ hash: latest_lamdenApprovalTxHash.hash, success: false });
          resolve(false);
        }
      } else {
        message.set(getErrorInfo(txResults));
        lamdenApprovalTxHash.set({ hash: latest_lamdenApprovalTxHash.hash, success: false });

        resolve(false);
      }
    });
  });

const sendBurn = (token, amount) =>
  new Promise((resolve) => {
    const ethereum_contract = token.address;
    const txInfo = {
      networkType: conf.lamden.clearingHouse.networkType,
      methodName: "burn",
      kwargs: {
        ethereum_contract,
        ethereum_address: get(selectedAccount),
        amount: { __fixed__: amount.toFixed(18) },
      },
      stampLimit: conf.lamden.stamps.burn,
    };

    get(lwc).sendTransaction(txInfo, async (txResults) => {
      console.log(txResults);
      if (txResults.status === "Transaction Cancelled") {
        message.set("Transaction canceled by user.");
      } else {
        if (txResults.data) {
          if (txResults.data.txHash)
          lamdenBurnTxHash.set({'hash': txResults.data.txHash, 'success': false})

        }
        if (txResults.status === "success") {
            let latest_lamdenBurnTxHash = get(lamdenBurnTxHash);
          try {
            const unSignedABI = txResults.data.txBlockResult.result;
            lamdenBurnTxHash.set({'hash': latest_lamdenBurnTxHash.hash, 'success': true})
            resolve(unSignedABI);
            return;
          } catch (error) {
            message.set("Transaction failed");
            lamdenBurnTxHash.set({'hash': latest_lamdenBurnTxHash.hash, 'success': false})
            isLoading.set(false);
          }
        } else {
            lamdenBurnTxHash.set({'hash': latest_lamdenBurnTxHash.hash, 'success': false})
          message.set(getErrorInfo(txResults));
        }
      }
      status.set("");
      isLoading.set(false);
      resolve(false);
    });
  });

const getUnsignedABIFromBlockchain = (txHash) =>
  new Promise((resolve) => {
    fetch(`${conf.lamden.network.apiLink}/transactions/get/${txHash}`)
      .then((res) => {
        if (res.status === 404) throw new Error();
        else return res.json();
      })
      .then((json) => {
        console.log({ json });
        if (!json) resolve(false);
        else {
          if (!json.result || json.result === null || json.result === "None")
            resolve(false);
          else resolve(json.result);
        }
      })
      .catch((err) => resolve(false));
  });

const getProof = (unSignedABI) =>
  new Promise((resolve) => {
    let timesToCheck = 60;
    let timesChecked = 0;

    const checkAgain = () => {
      timesChecked = timesChecked + 1;
      if (timesChecked <= timesToCheck) setTimeout(checkForProof, 1000);
      else {
        message.set(`Timed out attempting to get Proof of Burn from the Lamden Blockchain. Checked ${timesToCheck} times.`);
        resolve(false);
      }
    };

    const checkForProof = async () => {
      console.log({ timesChecked });
      fetch(
        `${conf.lamden.network.apiLink}/states/${
          conf.lamden.clearingHouse.contractName
        }/proofs/${unSignedABI.replace(/'/g, "")}`
      )
        .then((res) => res.json())
        .then((json) => {
          console.log({ json });
          if (!json) {
            checkAgain();
            return;
          }
          if (!json.value || json.value === null) {
            checkAgain();
            return;
          }
          resolve(json.value);
        });
    };
    checkForProof();
  });

const processProof = (unSignedABI, signedABI) => {
  try {
    signedABI = signedABI.substr(2); //remove 0x
    const r = "0x" + signedABI.slice(0, 64);
    const s = "0x" + signedABI.slice(64, 128);
    const v = "0x" + signedABI.slice(128, 130);

    const amountHex = "0x" + unSignedABI.substring(65, 129);
    const nonce = "0x" + unSignedABI.substring(129, 193);

    const token = conf.ethereum.tokens.find((t) => t.name === "WETH");

    if (!token || !r || !v || !s || !unSignedABI || !nonce) return false;

    return {
      unSignedABI,
      token: token.address,
      amount: amountHex,
      nonce: nonce,
      v,
      r,
      s,
    };
  } catch (e) {
    console.log(e);
    return false;
  }
};
export const checkEthTxStatus = async (txHash, web3) => {
  console.log({ checking: txHash });
  try {
    let response = await web3.eth.getTransactionReceipt(txHash);
    console.log(response);
    return response;
  } catch (e) {}
  return false;
};

export const checkEthTransactionUntilResult = async (
  txHash,
  web3,
  resolver
) => {
  let txHashInfo = await checkEthTxStatus(txHash, web3);
  if (!txHashInfo || !txHashInfo.status)
    setTimeout(
      () => checkEthTransactionUntilResult(txHash, web3, resolver),
      5000
    );
  else resolver(txHashInfo);
};

const sendProofToEthereum = async (proofData) => {
  let latest_web3 = get(web3);
  const clearingHouseContract = new latest_web3.eth.Contract(
    conf.ethereum.clearingHouse.abi,
    conf.ethereum.clearingHouse.address
  );

  let withdraw = clearingHouseContract.methods.withdraw(
    proofData.token,
    proofData.amount,
    proofData.nonce,
    proofData.v,
    proofData.r,
    proofData.s
  );

  return await new Promise((resolver) => {
    try {
      latest_web3 = get(web3);

      withdraw
        .send({ from: get(selectedAccount) })
        .once("transactionHash", (hash) => {
            ethTxHash.set({ hash: hash, success: false});

          checkEthTransactionUntilResult(
            hash,
            latest_web3,
            resolver
          );
        })
        .catch((err) => {
          if (err.code === 4001)
            resolver({ status: false, message: "User denied Metamask popup." });
          else resolver({ status: false });
        });
    } catch (err) {
      resolver({ status: false });
    }
  });
};

export async function startBurn(event) {
  ethTxHash.set({ hash: "", success: false });
  lamdenApprovalTxHash.set({ hash: "", success: false });
  lamdenBurnTxHash.set({ hash: "", success: false });
  isLoading.set(true);
  message.set("");
  status.set("");
  success.set("");
  const formData = new FormData(event.target);
  tokenName = formData.get("tokenName").toString();

  let amount = new BN(formData.get("quantity"));

  const token = conf.ethereum.tokens.find((t) => t.name === tokenName);

  if (!token) {
    isLoading.set(false);
    message.set("Invalid Token Selected.");
    return;
  }

  if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
    isLoading.set(false);
    message.set("Invalid quantity");
    return;
  }

  let currentApprovalAmount = await checkApproval();

  if (currentApprovalAmount.isLessThan(amount)) {
    if (
      get(tauBalance).isLessThan(
        conf.lamden.stamps.approval / conf.lamden.currentStampRatio
      )
    ) {
      status.set("");
      isLoading.set(false);
      message.set(`Not enough Lamden ${conf.lamden.currencySymbol} to send transactions.
                        Send ${conf.lamden.currencySymbol} to your Lamden Link account from within the Lamden Wallet.`);
      return;
    } else {
      if (!(await sendApproval(amount))) {
        isLoading.set(false);
        return;
      }
    }
  }

  if (
    get(tauBalance).isLessThan(
      conf.lamden.stamps.burn / conf.lamden.currentStampRatio
    )
  ) {
    isLoading.set(false);
    status.set("");
    message.set(`Not enough Lamden ${conf.lamden.currencySymbol} to send transactions.
                    Send ${conf.lamden.currencySymbol} to your Lamden Link account from within the Lamden Wallet.`);
  } else {
    status.set(`Attempting to Burn ${token.name} tokens on the Lamden Blockchain (check for Lamden Wallet popup)...`);
    const unSignedABI = await sendBurn(token, amount);
    let latest_status = get(status)
    let latest_isLoading = get(isLoading)
    console.log({ latest_status, latest_isLoading });

    if (!unSignedABI) {
      isLoading.set(false);
      status.set("");
      message.set(`Unable to Burn ${WETH} tokens on the Lamden Blockchain.`);
    } else {
      let latest_status = get(status)
      let latest_isLoading = get(isLoading)
      console.log({ latest_status, latest_isLoading });
      continueBurn(unSignedABI);
    }
  }
}

export const resumeBurn = async () => {
  ethTxHash.set({ hash: "", success: false });
  lamdenApprovalTxHash.set({ hash: "", success: false });
  lamdenBurnTxHash.set({ hash: "", success: false });

  const formData = new FormData(event.target);
  const txHash = formData.get("txHash").toString();

  isLoading.set(true);
  status.set("");
  message.set(`Checking Lamden Blockchain for Proof of token Burn...`);

  const unSignedABI = await getUnsignedABIFromBlockchain(txHash);
  console.log({ unSignedABI });
  console.log({ status });

  if (unSignedABI) {
    lamdenBurnTxHash.set({'hash': txHash, 'success': true})
    continueBurn(unSignedABI);
  } else {
    isLoading.set(false);
    status.set("");
    message.set("Unable to get Burn Result from transaction hash provided.");
  }
};

const continueBurn = async (unSignedABI) => {
  let latest_status = get(status)
  let latest_isLoading = get(isLoading)
  console.log({ latest_status, latest_isLoading });
  const signedABI = await getProof(unSignedABI);
  if (!signedABI) {
    isLoading.set(false);
    status.set("");
    return;
  } else {
    status.set(`Got Burn Proof from the Lamden Blockchain.`);
    let latest_status = get(status)
    let latest_isLoading = get(isLoading)
    console.log({ latest_status, latest_isLoading });
  }

  status.set(`Processing Burn Proof...`);
  console.log({ latest_status });

  const proofData = processProof(unSignedABI, signedABI);
  if (!proofData) {
    message.set("Malformed Proof");
    isLoading.set(false);
    status.set("");
    return;
  }
  status.set(`Sending ${tokenName} tokens from Lamden to Ethereum (check for Metamask popup)...`);
  console.log({ latest_status });
  const txHashResult = await sendProofToEthereum(proofData);
  console.log({ txHashResult });
  finishBurn(txHashResult);
};
const finishBurn = (txHashResult) => {
  isLoading.set(false);
  status.set("");
  message.set("");
  let latest_ethTxHash = get(ethTxHash);
  if (!txHashResult.status) {
    message.set(txHashResult.message || "Error sending Ethereum Transaction.");
    ethTxHash.set({ hash: latest_ethTxHash.hash, success: false });
    return;
  }
  ethTxHash.set({ hash: latest_ethTxHash.hash, success: true });
  console.log(ethApprovalTxHash.hash, ethDepositTxHash.hash, ethTxHash.hash)
  success.set(`${tokenName} tokens sent to Ethereum Chain`);
};

export const toggleResume = () => (newSwap = !newSwap);

export const handleAmountInput = (e) => {
  e.target.setCustomValidity("");
  e.target.value = e.target.value
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*)\./g, "$1");
};
export const handleAmountInvalid = (e) =>
  e.target.setCustomValidity("A number is required");

export const handleTxHashInput = (e) => e.target.setCustomValidity("");
export const handleTxHashInvalid = (e) =>
  e.target.setCustomValidity("Invalid Lamden Transaction Hash");
