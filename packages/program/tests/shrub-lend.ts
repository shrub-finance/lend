import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { ShrubLend } from "../target/types/shrub_lend";

describe("shrub-lend", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.ShrubLend as Program<ShrubLend>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
