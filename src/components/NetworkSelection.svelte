<script lang="ts">
  import { ethBalance, tauBalance } from "../stores/lamden";

  export let network: string;
  export let direction: string;


</script>

<div class="network-field">
  <fieldset class="bridge-field">
    <legend class="field-label">{direction}</legend>
    <div class="network">
      {network}
    </div>
  </fieldset>
  <div class="description balance">
    <div>
      {#if network == "Ethereum"}
        {$ethBalance}
      {:else if network == "Lamden"}
        {$tauBalance}
      {/if}
        {#if network == "Ethereum"}
          {' ETH'}
        {:else if network == "Lamden"}
          {' TAU'}
        {/if}
    </div>
    
  </div>
</div>

<style>
  .balance {
    font-size: smaller;
    padding-left: 1rem;
    padding-top: .5rem;
  }
  .network {
    padding-right: 2rem;
    padding-bottom: 0.5rem;
  }
</style>
