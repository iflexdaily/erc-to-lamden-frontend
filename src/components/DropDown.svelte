<script>
  import { web3, selectedAccount, chainData } from "svelte-web3";
  import {
    vk,
    ethBalance,
    lamden_origin,
    tauBalance,
    checkTokenBalanceFunction,
    token_selected,
    eth_token_balance,
    lamden_token_balance
  } from "../stores/lamden";
  import { checkEthereumTokenBalance, checkLamdenTokenBalance } from '../js/utils'

  export let network;



  let current_network;
  let refresher = function (network) {
    console.log(3);
    try {
      if (current_network && current_network != network) {
        let dropdown = document.getElementById("tokenNameDropDown");
        dropdown.selectedIndex = "0";
        console.log(current_network, network, dropdown);
      }
      tokenName = null;
      current_network = network;
      return "";
    } catch {
      return "";
    }
  };
  function checkTokenBalance(network) {
    let check_func;
    if (network == "Ethereum") {
      check_func = checkEthereumTokenBalance;
    } else {
      check_func = checkLamdenTokenBalance;
    }
    checkTokenBalanceFunction.set(check_func);
    
  }

  let openModal = function (network) {
    checkTokenBalance(network)
    var modal = document.getElementById("myModal");

    var span = document.getElementsByClassName("close")[0];

    modal.style.display = "block";

    span.onclick = function () {
      modal.style.display = "none";
    };

    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  };
</script>

<div>
  <fieldset class="bridge-field field-drop">
    <legend class="field-label">Token Name</legend>

    <div class="drop-down">
      {#if ($token_selected)}
      <div>Selected: {$token_selected}</div>
      <div style="width: 30%;">
        <button on:click={() => openModal(network)}> Change </button>
      </div>
      {:else}
      <button on:click={() => openModal(network)}> Select </button>
      {/if}
      
      {refresher(network)}
    </div>
  </fieldset>
  {#if $token_selected}
    {#if network == "Ethereum"}
      <div class="token-balance">
        Your {network}
        {$token_selected} balance is: {$eth_token_balance}
        {$token_selected}
      </div>
    {:else if network == "Lamden"}
      <div class="token-balance">
        Your {network}
        {$token_selected} balance is: {$lamden_token_balance}
        {$token_selected}
      </div>
    {/if}
  {/if}
</div>

<style>
  .token-balance {
    padding-left: 1rem;
    padding-top: 0.5rem;
  }
</style>
