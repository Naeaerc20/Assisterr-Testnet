// scripts/apis.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Define the API URLs
const CHECK_IN_URL = 'https://api.assisterr.ai/incentive/users/me/daily_points/';
const USER_INFO_URL = 'https://api.assisterr.ai/incentive/users/me/';
const LOGIN_MESSAGE_URL = 'https://api.assisterr.ai/incentive/auth/login/get_message/';
const LOGIN_URL = 'https://api.assisterr.ai/incentive/auth/login/';
const SET_USER_INFO_URL = 'https://api.assisterr.ai/incentive/users/me/set_info/'; // New API endpoint

// Define the paths to the JSON files
const BEARERS_FILE_PATH = path.join(__dirname, '../bearers.json');
const WALLETS_FILE_PATH = path.join(__dirname, '../wallets.json');

// Function to read and parse the Bearers JSON file
const getBearers = () => {
    try {
        const bearersData = fs.readFileSync(BEARERS_FILE_PATH, 'utf-8');
        const bearers = JSON.parse(bearersData);
        return bearers;
    } catch (error) {
        console.error("Error reading the bearers.json file:", error.message);
        throw new Error('Failed to read bearers.json');
    }
};

// Function to read and parse the Wallets JSON file
const getWallets = () => {
    try {
        const walletsData = fs.readFileSync(WALLETS_FILE_PATH, 'utf-8');
        const wallets = JSON.parse(walletsData);
        return wallets;
    } catch (error) {
        console.error("Error reading the wallets.json file:", error.message);
        throw new Error('Failed to read wallets.json');
    }
};

// Function to get the login message
const getLoginMessage = async () => {
    try {
        const response = await axios.get(LOGIN_MESSAGE_URL);
        if (response.status === 200) {
            return response.data; // Assuming the response is a string
        } else {
            throw new Error(`Unexpected response status: ${response.status}`);
        }
    } catch (error) {
        throw error;
    }
};

// Function to perform login and obtain the access_token
const login = async (key, message, signature) => {
    try {
        const payload = {
            key,
            message,
            signature
        };
        const response = await axios.post(LOGIN_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 200) {
            return response.data.access_token;
        } else {
            throw new Error(`Unexpected response status: ${response.status}`);
        }
    } catch (error) {
        throw error;
    }
};

// Function to perform daily check-in with a Bearer token
const doDailyCheckIn = async (Bearer) => {
    try {
        const response = await axios.post(CHECK_IN_URL, {}, {
            headers: {
                authorization: `Bearer ${Bearer}`
            }
        });
        return response.data;
    } catch (error) {
        // Rethrow the error for index.js to handle
        throw error;
    }
};

// Function to get user information with a Bearer token
const getUserInfo = async (Bearer) => {
    try {
        const response = await axios.get(USER_INFO_URL, {
            headers: {
                authorization: `Bearer ${Bearer}`
            }
        });
        return response.data;
    } catch (error) {
        // Rethrow the error for index.js to handle
        throw error;
    }
};

// Function to set or update user information
const setUserInfo = async (Bearer, username) => {
    try {
        const payload = {
            avatar: "https://avataaars.io/?accessoriesType=Wayfarers&avatarStyle=Circle&clotheColor=PastelRed&clotheType=Overall&eyeType=Hearts&eyebrowType=FlatNatural&facialHairColor=BrownDark&facialHairType=Blank&hairColor=Red&hatColor=Heather&mouthType=Twinkle&skinColor=Black&topType=LongHairFrida",
            username: username
        };
        const response = await axios.post(SET_USER_INFO_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Bearer}`
            }
        });
        if (response.status === 200) {
            return response.data;
        } else {
            throw new Error(`Unexpected response status: ${response.status}`);
        }
    } catch (error) {
        throw error;
    }
};

// Export all functions
module.exports = {
    getBearers,
    getWallets,
    getLoginMessage,
    login,
    doDailyCheckIn,
    getUserInfo,
    setUserInfo // Export the new function
};
