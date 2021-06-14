<script lang="ts">
  import NavLogo from "./NavigationLogo.svelte";
  import NavLink from "./NavigationLink.svelte";
  import Hamburger from "./HamburgerSVG.svelte"
  let links = [
    { name: "Lamden Link", href: () => {} },
    { name: "Explorer", href: "location.href='https://mainnet.lamden.io/'" },
    { name: "Wallet", href: () => {} },
    { name: "Lamden.io", href: "location.href='https://lamden.io/en/'" },
  ];
</script>

<div class="navigation-bar">
    <div class="nav-logo-container">
        <NavLogo/>
    </div>
    <div class="hamburger-container">
      <Hamburger/>
    </div>
    <div class="navigation-bar-links">
      {#each links as link}
        <NavLink link={link.name} href={link.href} />
      {/each}
    </div>
  
</div>

<style>
    .navigation-bar-links {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;      
    }
    .navigation-bar {
      margin-top: 1rem;
      width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;      
    }
    .nav-logo-container {
      width: 40%;
    }
    .hamburger-container {

    }
</style>
