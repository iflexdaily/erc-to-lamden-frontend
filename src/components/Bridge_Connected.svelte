<script lang="ts">
  import Alert from "./Alert.svelte";
  import Header from "./BridgeHeader.svelte";
  import Arrow from "./ArrowSVG.svelte";
  import DropDown from "./DropDown.svelte";
  import Input from "./Input.svelte";
  import NetworkSelection from "./NetworkSelection.svelte";
  import Button from "./Button.svelte";
  import Popup from './Popup.svelte'
  import { onMount } from "svelte";
  //import Alert from "../components/alert.svelte";
  import { projectConf } from "../conf.js";
  import {
    checkChain,
    checkETHBalance,
    checkLamdenBalance,
    network_to,
    network_from,
    set_swap_func
  } from "../js/utils";
  import { chainData } from "svelte-web3";
  import {
    vk,
    ethBalance,
    lamden_origin,
    tauBalance,
    checkTokenBalanceFunction,
    message,
    success,
    status,
    resume_burn
  } from "../stores/lamden";

  let tokenName = null;
  $: selectedToken = tokenName;
  let conf = projectConf["testnet"];

  $: buttonDisabled =
    $chainData.chainId !== conf.ethereum.chainId ||
    $ethBalance.isLessThanOrEqualTo(0);

  chainData.subscribe((current) => checkChain(current));

  onMount(async () => {
    console.log($chainData);
    checkChain($chainData);
    checkETHBalance();
    checkLamdenBalance();
    console.log($ethBalance, $tauBalance);
  });
</script>

<div class="bridge-connected">
  <Popup/>
  <Header
    title={"Bridge"}
    description={"You're connected to the bridge and good to go."}
    status={$status}
    error={$message}
    success={$success}
  />
  <form
    on:submit|preventDefault={set_swap_func($lamden_origin)}
    action="#"
    method="POST"
    style="width:100%"
  >
    <div class="network-selection-container">
      <NetworkSelection
        direction={"From"}
        network={network_from($lamden_origin)}
      />
      <Arrow />
      <NetworkSelection direction={"To"} network={network_to($lamden_origin)} />
    </div>
    {#if !$resume_burn}
      <div class="container">
        <DropDown network={network_from($lamden_origin)} />
      </div>
      <div class="container">
        <Input title={'Amount'}/>
      </div>
    {:else}
    <div class="container">
      <Input title={'Lamden BURN Transaction Hash'}/>
    </div>
    {/if}
    <div class="container" style="margin-top:1rem">

    <Button
      text={`SEND TOKENS TO ${network_to($lamden_origin).toUpperCase()}`}
      clicked={""}
    />
    </div>
  </form>
</div>

<style>
  .loading {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(249, 249, 249, 0.9);
  }
  .is-loading {
    display: block;
  }
  .status {
    margin: 0;
  }

</style>
