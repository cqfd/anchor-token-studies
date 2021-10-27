import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { Program } from '@project-serum/anchor';
import { TokenStudies } from '../target/types/token_studies';

// Configure the client to use the local cluster.
anchor.setProvider(anchor.Provider.env());

const program = anchor.workspace.TokenStudies as Program<TokenStudies>;

describe('token-studies', () => {

  it('Is initialized!', async () => {

    const [mint, mintBump] = await anchor.web3.PublicKey.findProgramAddress([], program.programId);

    let ourAssociatedTokens = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mint,
      program.provider.wallet.publicKey,
    );

    await program.rpc.initMint(mintBump, {
      accounts: {
        mint: mint,
        payer: program.provider.wallet.publicKey,
        destination: ourAssociatedTokens,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY
      },
    });

    let nicelyParsedMint = await fetchMint(mint);
    let nicelyParsedDestinationRightAfterMint = await fetchTokenAccount(ourAssociatedTokens);
    debugger;

    // await program.provider.connection.confirmTransaction(
    //   await program.rpc.airdrop(mintBump, {
    //     accounts: {
    //       mint: mint,
    //       destination: destination,
    //       payer: program.provider.wallet.publicKey,
    //       systemProgram: anchor.web3.SystemProgram.programId,
    //       tokenProgram: spl.TOKEN_PROGRAM_ID,
    //       associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
    //       rent: anchor.web3.SYSVAR_RENT_PUBKEY
    //     }
    //   }),
    //   "finalized"
    // );

    await program.rpc.airdrop(mintBump, {
      accounts: {
        mint: mint,
        destination: ourAssociatedTokens,
        payer: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY
      }
    });

    let nicelyParsedDestination = await fetchTokenAccount(ourAssociatedTokens);

    let friend = anchor.web3.Keypair.generate();
    let friendsAssociatedTokenAccount = await spl.Token.getAssociatedTokenAddress(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mint,
      friend.publicKey,
    );

    let ix = spl.Token.createAssociatedTokenAccountInstruction(
      spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      spl.TOKEN_PROGRAM_ID,
      mint,
      friendsAssociatedTokenAccount,
      friend.publicKey,
      program.provider.wallet.publicKey
    );

    let tx = new anchor.web3.Transaction();
    tx.add(ix);
    // tx.recentBlockhash = await (await program.provider.connection.getRecentBlockhash()).blockhash;
    // tx = await program.provider.wallet.signTransaction(tx);
    await program.provider.send(tx);


    tx = new anchor.web3.Transaction();
    tx.add(
      spl.Token.createTransferInstruction(
        spl.TOKEN_PROGRAM_ID,
        ourAssociatedTokens,
        friendsAssociatedTokenAccount,
        program.provider.wallet.publicKey,
        [],
        1
      )
    );
    await program.provider.send(tx);

    let friendsTokens = await fetchTokenAccount(friendsAssociatedTokenAccount);
    let ourUpdatedTokens = await fetchTokenAccount(ourAssociatedTokens);


    await program.rpc.burn(mintBump, {
      accounts: {
        mint: mint,
        source: friendsAssociatedTokenAccount,
        owner: friend.publicKey,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      },
      signers: [friend]
    });

    let friendsTokensAfterBurn = await fetchTokenAccount(friendsAssociatedTokenAccount);
    debugger;

  });
});

async function fetchMint(address: anchor.web3.PublicKey): Promise<Object> {
    let mintAccountInfo = await program.provider.connection.getAccountInfo(address);
    return spl.MintLayout.decode(mintAccountInfo.data);
}

async function fetchTokenAccount(address: anchor.web3.PublicKey): Promise<Object> {
    let tokenAccountInfo = await program.provider.connection.getAccountInfo(address);
    return spl.AccountLayout.decode(tokenAccountInfo.data);
}

const sleep = ms => new Promise(awaken => setTimeout(awaken, ms));