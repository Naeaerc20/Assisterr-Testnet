// index.js

// Ensure you have installed the necessary packages by running:
// npm install @solana/web3.js bs58 tweetnacl tweetnacl-util colors console-clear cli-table3 figlet readline-sync

const fs = require('fs');
const colors = require('colors');
const clear = require('console-clear');
const Table = require('cli-table3');
const figlet = require('figlet');
const readline = require('readline-sync');
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const { decodeUTF8 } = require('tweetnacl-util');
const { Keypair } = require('@solana/web3.js');

// Import custom functions from scripts/apis
const { getBearers, getWallets, getLoginMessage, login, doDailyCheckIn, getUserInfo, setUserInfo } = require('./scripts/apis');

// Define icons for better readability
const ICONS = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    checkIn: '🔄',
    welcome: '👋',
    creator: '👑',
    fetching: '⏳'
};

// Function to display the Figlet banner
const showBanner = () => {
    console.log(
        colors.green(
            figlet.textSync('ASSR BOT', {
                horizontalLayout: 'default',
                verticalLayout: 'default'
            })
        )
    );
};

// Function to display welcome messages
const showWelcomeMessages = () => {
    console.log(colors.green(`${ICONS.welcome} Hello! Welcome to Assisterr Airdrop AutoFarming Bot`));
    console.log(colors.green(`${ICONS.creator} Created by Naeaex - x.com/naeaex_dev - github.com/Naeaerc20`));
    console.log(colors.green(`${ICONS.fetching} We're fetching your data... Please wait\n`));
};

// Function to format points
const formatPoints = (points) => {
    if (points === null || points === undefined) return 'N/A';
    const pointsStr = points.toString();
    if (pointsStr.length < 3) return pointsStr;
    return pointsStr.slice(0, -2) + '.' + pointsStr.slice(-2);
};

// Function to safely get user data fields
const safeGet = (data, field) => {
    if (data && data[field] !== null && data[field] !== undefined) {
        return data[field];
    }
    return 'N/A';
};

// Function to display the user table using cli-table3
const displayUserTable = async (bearers, wallets) => {
    const table = new Table({
        head: ['ID', 'USERNAME', 'WALLET', 'POINTS'].map(header => colors.cyan(header)),
        colWidths: [5, 20, 50, 10] // Adjusted column widths
    });

    for (let i = 0; i < wallets.length; i++) {
        try {
            const bearer = bearers[i];
            if (!bearer) {
                throw new Error('No access_token available');
            }
            const userInfo = await getUserInfo(bearer);
            const walletInfo = wallets[i];

            table.push([
                walletInfo.id,
                safeGet(userInfo, 'username'),
                walletInfo.wallet,
                formatPoints(safeGet(userInfo, 'points'))
            ]);
        } catch (error) {
            table.push([
                wallets[i].id,
                colors.red('N/A'),
                wallets[i].wallet,
                colors.red('N/A')
            ]);
        }
    }

    console.log(table.toString());
};

// Function to sign a message using the Solana private key
const signMessage = (privateKeyBase58, message) => {
    try {
        // Decode the private key from Base58
        const secretKey = bs58.decode(privateKeyBase58);
        console.log(`Decoding private key... Length: ${secretKey.length} bytes`);

        if (secretKey.length !== 64) {
            throw new Error(`Invalid secret key length: ${secretKey.length} bytes. Expected 64 bytes.`);
        }

        // Sign the message using nacl.sign.detached
        const messageBytes = Buffer.from(message, 'utf-8');
        const signature = nacl.sign.detached(messageBytes, secretKey);

        // Convert the signature to Base58
        const signatureBase58 = bs58.encode(signature);

        // Return the signature in Base58
        return signatureBase58;
    } catch (error) {
        console.error(colors.red(`${ICONS.error} Failed to sign message: ${error.message}`));
        throw error;
    }
};

// Function to update the access_token in bearers.json
const updateBearers = (bearers, index, newAccessToken) => {
    bearers[index] = newAccessToken;
    try {
        fs.writeFileSync('bearers.json', JSON.stringify(bearers, null, 2), 'utf-8');
        console.log(colors.green(`${ICONS.success} Updated access_token for User ${index + 1}`));
    } catch (error) {
        console.error(colors.red(`${ICONS.error} Failed to update bearers.json: ${error.message}`));
    }
};

// Function to authenticate all wallets and update bearers.json
const authenticateAllWallets = async (wallets) => {
    const bearers = []; // New list of bearers

    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        console.log(`\nAuthenticating Account ${wallet.id}: ${wallet.wallet}`);
        try {
            // 1. Get the login message
            const message = await getLoginMessage();
            console.log(`Message obtained: ${message}`);

            // 2. Sign the message with the Solana private key
            const signature = signMessage(wallet.privateKey, message);
            console.log(`Signature (Base58): ${signature}`);

            // 3. Send the payload to get the access_token
            const newAccessToken = await login(wallet.wallet, message, signature);
            console.log(`Access Token obtained: ${newAccessToken}`);

            // 4. Add the new access_token to the bearers list
            bearers.push(newAccessToken);

            // 5. Wait for 1 second before processing the next wallet
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(colors.red(`${ICONS.error} Error authenticating Account ${wallet.id}: ${error.message}`));
            bearers.push("");
            // Wait for 1 second before processing the next wallet
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // 6. Write the updated bearers list to bearers.json
    try {
        fs.writeFileSync('bearers.json', JSON.stringify(bearers, null, 2), 'utf-8');
        console.log(colors.green(`\n${ICONS.success} All bearers updated successfully in bearers.json`));
    } catch (error) {
        console.error(colors.red(`${ICONS.error} Failed to write bearers.json: ${error.message}`));
    }

    return bearers; // Return the updated bearers
};

// Function to perform the check-in
const performCheckIn = async (bearers, wallets, continuous = false) => {
    let dayCounter = 0;

    const checkInTask = async () => {
        for (let i = 0; i < bearers.length; i++) {
            const bearer = bearers[i];
            const wallet = wallets[i];

            try {
                if (!bearer) {
                    throw new Error('No access_token available');
                }

                // 1. Perform the daily check-in with the access_token
                const response = await doDailyCheckIn(bearer);
                const userInfo = await getUserInfo(bearer);
                const username = safeGet(userInfo, 'username');
                const points = formatPoints(safeGet(userInfo, 'points'));

                if (continuous) {
                    dayCounter++;
                    const displayName = username !== 'N/A' ? username : `User ${i + 1}`;
                    console.log(colors.green(
                        `${ICONS.success} ${displayName} Performed Check In for ${dayCounter} consecutive days - Your points are now ${points}`
                    ));
                } else {
                    const displayName = username !== 'N/A' ? username : `User ${i + 1}`;
                    console.log(colors.green(
                        `${ICONS.success} ${displayName} Performed Check successfully - Your points are now ${points}`
                    ));
                }

                // 2. Wait for 1 second before processing the next account
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                if (error.response && error.response.status === 400) {
                    let username = 'N/A';
                    try {
                        const userInfo = await getUserInfo(bearer);
                        username = safeGet(userInfo, 'username');
                    } catch (e) {
                        // If fetching user info fails, keep username as 'N/A'
                    }
                    const displayName = username !== 'N/A' ? username : `User ${i + 1}`;
                    console.log(colors.red(
                        `${ICONS.error} ${displayName} has already performed Check-In today. Please wait 24 hours and try again.`
                    ));
                } else {
                    console.error(colors.red(`${ICONS.error} Error performing check-in for account ${i + 1}: ${error.message}`));
                }

                // 3. Wait for 1 second before processing the next account
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (continuous) {
            console.log(colors.yellow(`${ICONS.info} Check-in completed. Waiting 24 hours for the next check-in...`));
            setTimeout(async () => {
                // Renew bearers before performing the next check-in
                console.log(colors.yellow(`${ICONS.info} Starting a new check-in cycle...`));
                const newBearers = await authenticateAllWallets(wallets);
                // Update bearers in memory
                bearers = newBearers;
                // Perform the next check-in with new bearers
                await checkInTask();
            }, 24 * 60 * 60 * 1000); // 24 hours
        }
    };

    // Perform the first check-in immediately
    await checkInTask();
};

// Function to set or update usernames
const setUsernames = async (bearers, wallets) => {
    for (let i = 0; i < bearers.length; i++) {
        const bearer = bearers[i];
        const wallet = wallets[i];

        try {
            if (!bearer) {
                throw new Error('No access_token available');
            }

            // Fetch current user info
            const userInfo = await getUserInfo(bearer);
            let currentUsername = safeGet(userInfo, 'username');

            if (!currentUsername || currentUsername.trim() === "") {
                // If username is empty or null, prompt to set a new username
                console.log(colors.cyan(`\nWallet ID: ${wallet.id}`));
                const newUsername = readline.question('Enter a username for this wallet: ').trim();

                if (newUsername === "") {
                    console.log(colors.red('Username cannot be empty. Skipping...\n'));
                    continue;
                }

                // Set the new username using the API
                await setUserInfo(bearer, newUsername);
                console.log(colors.green(`${ICONS.success} Username set to "${newUsername}" for Wallet ID ${wallet.id}`));
            } else {
                // If username exists, ask if the user wants to change it
                console.log(colors.cyan(`\nWallet ID: ${wallet.id}`));
                console.log(`Current Username: ${colors.yellow(currentUsername)}`);
                const change = readline.question('Do you want to change the username? (y/n): ').toLowerCase().trim();

                if (change === 'y') {
                    const newUsername = readline.question('Enter the new username: ').trim();

                    if (newUsername === "") {
                        console.log(colors.red('Username cannot be empty. Skipping...\n'));
                        continue;
                    }

                    // Set the new username using the API
                    await setUserInfo(bearer, newUsername);
                    console.log(colors.green(`${ICONS.success} Username updated to "${newUsername}" for Wallet ID ${wallet.id}`));
                } else {
                    console.log(colors.yellow('Skipping username update.\n'));
                }
            }

            // Optional: Wait for a short duration to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(colors.red(`${ICONS.error} Error setting username for Wallet ID ${wallet.id}: ${error.message}`));
            // Continue with the next wallet
        }
    }
};

// Main function
const main = async () => {
    clear();
    showBanner();

    // Show welcome messages
    showWelcomeMessages();

    // 1. Read the wallets
    let wallets;
    try {
        wallets = getWallets();
    } catch (error) {
        console.error(colors.red(`${ICONS.error} Failed to load wallets. Ensure that wallets.json is correctly formatted.`));
        process.exit(1);
    }

    // 2. Authenticate all wallets and update bearers.json
    let bearers = await authenticateAllWallets(wallets);

    // 3. Clear the console and show the banner again
    clear();
    showBanner();

    // Show welcome messages again
    showWelcomeMessages();

    // 4. Display the user table
    await displayUserTable(bearers, wallets);

    // 5. Menu options
    const options = `
Select an option:
1. Perform Daily Check In
2. Set Usernames
0. Exit
Option: `;

    const choice = readline.question(options).trim();

    if (choice === '1') {
        const continuousChoice = readline.question('Do you wish to perform check in constantly? (y/n): ').toLowerCase().trim();

        console.log(); // Add a blank line for better readability

        if (continuousChoice === 'y') {
            performCheckIn(bearers, wallets, true);
        } else if (continuousChoice === 'n') {
            await performCheckIn(bearers, wallets, false);
        } else {
            console.log(colors.red(`${ICONS.error} Invalid option. Exiting...`));
            process.exit(0);
        }
    } else if (choice === '2') {
        await setUsernames(bearers, wallets);
    } else if (choice === '0') {
        console.log(colors.green(`${ICONS.success} Exiting...`));
        process.exit(0);
    } else {
        console.log(colors.red(`${ICONS.error} Invalid option. Exiting...`));
        process.exit(0);
    }
};

// Execute the main function
main();
