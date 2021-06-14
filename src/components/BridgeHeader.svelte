<script lang="ts">

    import { ethApprovalTxHash, ethDepositTxHash, lamdenApprovalTxHash, lamdenBurnTxHash, ethTxHash, lamden_origin, isLoading, resume_burn} from '../stores/lamden'
    import Loader from './Loader.svelte'
    import Button from './Button.svelte'
    import Alert from './Alert.svelte'
  export let title: string;
  export let description: string;
  export let error: any;
  export let status: any;
  export let success: any;
</script>

<div class="">
    <div>
          <div class="bridge-header">
            {title}
          </div>

    </div>


 

  <h3 class="description" style="width: 100%;">
    {description}
  </h3>

  {#if ($lamden_origin)}
  <div style="float: right;margin-left:1rem">
    {#if (!$resume_burn)}
    <Button text={'Resume Swap'} clicked={() => resume_burn.set(true)}/>
    {:else}
    <Button text={'Create New Swap'} clicked={() => resume_burn.set(false)}/>
    {/if}
  </div>
  {/if}

  {#if status && !success}
    {#if ($isLoading)}
    <Loader/>
    {/if}
    <div>
      {status}
    </div>
  {:else if success}
    <div>
      <Alert text={success} isError={false}/>
    </div>
    {#if (!$lamden_origin)}
    <div>
        Eth Approval Tx Hash: {$ethApprovalTxHash.hash}
    </div>
    <div>
        Eth Deposit Tx Hash: {$ethDepositTxHash.hash}
    </div>
    {:else}
    <div>
        Lamden Approval Tx Hash: {$lamdenApprovalTxHash.hash}
    </div>
    <div>
        Lamden Burn Tx Hash: {$lamdenBurnTxHash.hash}
    </div>
    <div>
        Eth Tx Hash: {$ethTxHash.hash}
    </div>
    {/if}
  {:else if error}
    <div>
      <Alert text={error} isError={true}/>
    </div>
  {/if}
</div>

<style>

</style>
