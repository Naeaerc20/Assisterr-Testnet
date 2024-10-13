// walletCreator.js

// Ensure you have the necessary packages installed by running:
// npm install @solana/web3.js bs58 readline-sync colors

const fs = require('fs');
const readline = require('readline-sync');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const colors = require('colors');

// Path to the wallets.json file
const WALLETS_FILE = 'wallets.json';

// Function to load existing wallets from wallets.json
const loadExistingWallets = () => {
    if (fs.existsSync(WALLETS_FILE)) {
        try {
            const data = fs.readFileSync(WALLETS_FILE, 'utf8');
            const wallets = JSON.parse(data);
            if (Array.isArray(wallets)) {
                return wallets;
            } else {
                console.error(colors.red(`Error: ${WALLETS_FILE} is not properly formatted.`));
                process.exit(1);
            }
        } catch (error) {
            console.error(colors.red(`Error reading ${WALLETS_FILE}: ${error.message}`));
            process.exit(1);
        }
    } else {
        // If wallets.json does not exist, return an empty array
        return [];
    }
};

// Function to save wallets to wallets.json
const saveWallets = (wallets) => {
    try {
        fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2), 'utf8');
        console.log(colors.green(`\nSuccessfully saved ${wallets.length} wallet(s) to ${WALLETS_FILE}.`));
    } catch (error) {
        console.error(colors.red(`Error writing to ${WALLETS_FILE}: ${error.message}`));
        process.exit(1);
    }
};

// Function to generate a single wallet
const generateWallet = () => {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKey = bs58.encode(keypair.secretKey);
    return { publicKey, privateKey };
};

// Function to display generated wallets without using cli-table3
const displayNewWallets = (newWallets) => {
    console.log(colors.green('\nNew Wallets Generated:\n'));
    newWallets.forEach(wallet => {
        console.log(colors.cyan(`ID: ${wallet.id}`));
        console.log(`Wallet: ${wallet.wallet}`);
        console.log(`Private Key: ${wallet.privateKey}\n`);
    });
};

// Main function
const main = () => {
    console.log(colors.blue.bold('\nWallet Creator\n'));

    // Prompt the user for the number of wallets to generate
    let numWallets;
    while (true) {
        const input = readline.question('Enter the number of wallets to generate: ').trim();
        numWallets = parseInt(input, 10);

        if (isNaN(numWallets) || numWallets <= 0) {
            console.log(colors.red('Please enter a valid positive number.\n'));
        } else {
            break;
        }
    }

    // Load existing wallets
    const existingWallets = loadExistingWallets();

    // Determine the starting ID
    let startId = 1;
    if (existingWallets.length > 0) {
        const lastWallet = existingWallets[existingWallets.length - 1];
        if (lastWallet.id && Number.isInteger(lastWallet.id)) {
            startId = lastWallet.id + 1;
        } else {
            console.warn(colors.yellow(`Warning: Last wallet does not have a valid 'id'. Starting from ID 1.`));
        }
    }

    // Generate new wallets
    const newWallets = [];
    for (let i = 0; i < numWallets; i++) {
        const wallet = generateWallet();
        const walletEntry = {
            id: startId + i,
            wallet: wallet.publicKey,
            privateKey: wallet.privateKey
        };
        newWallets.push(walletEntry);
    }

    // Append new wallets to existing wallets
    const updatedWallets = existingWallets.concat(newWallets);

    // Save the updated wallets to wallets.json
    saveWallets(updatedWallets);

    // Display the newly created wallets without using cli-table3
    displayNewWallets(newWallets);
};

// Execute the main function
main();
