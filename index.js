const { ethers } = require('ethers');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const UserAgent = require('fake-useragent');
const moment = require('moment-timezone');
const chalk = require('chalk');
const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');

// Promisify readline for async/await usage
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

class AquaFlux {
    constructor() {
        this.HEADERS = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": "https://playground.aquaflux.pro",
            "Referer": "https://playground.aquaflux.pro/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site"
        };
        this.BASE_API = "https://api.aquaflux.pro/api/v1";
        this.RPC_URL = "https://testnet.dplabs-internal.com/";
        this.AQUAFLUX_NFT_ADDRESS = "0xCc8cF44E196CaB28DBA2d514dc7353af0eFb370E";
        this.AQUAFLUX_CONTRACT_ABI = [{"type":"function","name":"claimTokens","stateMutability":"nonpayable","inputs":[],"outputs":[]},{"type":"function","name":"combineCS","stateMutability":"nonpayable","inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"outputs":[]},{"type":"function","name":"combinePC","stateMutability":"nonpayable","inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"outputs":[]},{"type":"function","name":"combinePS","stateMutability":"nonpayable","inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"outputs":[]},{"type":"function","name":"hasClaimedStandardNFT","stateMutability":"view","inputs":[{"internalType":"address","name":"owner","type":"address"}],"outputs":[{"internalType":"bool","name":"","type":"bool"}]},{"type":"function","name":"hasClaimedPremiumNFT","stateMutability":"view","inputs":[{"internalType":"address","name":"owner","type":"address"}],"outputs":[{"internalType":"bool","name":"","type":"bool"}]},{"type":"function","name":"mint","stateMutability":"nonpayable","inputs":[{"internalType":"enum AquafluxNFT.NFTType","name":"nftType","type":"uint8"},{"internalType":"uint256","name":"expiresAt","type":"uint256"},{"internalType":"bytes","name":"signature","type":"bytes"}],"outputs":[]}];

        this.proxies = [];
        this.proxyIndex = 0;
        this.accountProxies = {}; // { address: proxy }
        this.accessTokens = {};   // { address: token }
        this.usedNonce = {};      // { address: nonce }
    }

    log(message) {
        const timestamp = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        console.log(`${chalk.cyan.bold(`[ ${timestamp} ]`)} ${chalk.white.bold('|')} ${message}`);
    }

    welcome() {
        console.log(chalk.green.bold("\nAquaFlux NFT") + chalk.yellow.bold(" Auto BOT"));
        console.log(chalk.green.bold("Code Reshaped/Structured: ") + chalk.yellow.bold("forestarmy\n"));
    }

    clearTerminal() {
        process.stdout.write('\x1B[2J\x1B[0f');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    formatSeconds(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    async loadProxies(useProxyChoice) {
        const filename = "proxy.txt";
        try {
            let proxyContent = "";
            if (useProxyChoice === 1) { // Free proxies
                const response = await axios.get("https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies/http.txt");
                proxyContent = response.data;
                await fs.writeFile(filename, proxyContent, 'utf-8');
            } else { // Private proxies from file
                if (!fs.existsSync(filename)) {
                    this.log(chalk.red.bold(`File ${filename} not found.`));
                    return;
                }
                proxyContent = await fs.readFile(filename, 'utf-8');
            }
            this.proxies = proxyContent.split('\n').map(p => p.trim()).filter(Boolean);
            if (!this.proxies.length) {
                this.log(chalk.red.bold("No proxies found."));
                return;
            }
            this.log(chalk.green.bold("Proxies Total: ") + chalk.white.bold(this.proxies.length));
        } catch (error) {
            this.log(chalk.red.bold(`Failed to load proxies: ${error.message}`));
            this.proxies = [];
        }
    }

    checkProxyScheme(proxy) {
        if (!/^(http|https|socks4|socks5):\/\//.test(proxy)) {
            return `http://${proxy}`;
        }
        return proxy;
    }
    
    getAxiosInstance(proxyUrl) {
        if (!proxyUrl) return axios.create();

        const agent = proxyUrl.startsWith('socks') 
            ? new SocksProxyAgent(proxyUrl)
            : new HttpsProxyAgent(proxyUrl);

        return axios.create({ httpsAgent: agent, httpAgent: agent });
    }

    getNextProxyForAccount(address) {
        if (!this.proxies.length) return null;
        if (!this.accountProxies[address]) {
            const proxy = this.checkProxyScheme(this.proxies[this.proxyIndex]);
            this.accountProxies[address] = proxy;
            this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
        }
        return this.accountProxies[address];
    }
    
    rotateProxyForAccount(address) {
        if (!this.proxies.length) return null;
        const proxy = this.checkProxyScheme(this.proxies[this.proxyIndex]);
        this.accountProxies[address] = proxy;
        this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
        this.log(chalk.yellow(`Rotated proxy for ${this.maskAccount(address)} to: ${proxy}`));
        return proxy;
    }

    generateAddress(privateKey) {
        try {
            return new ethers.Wallet(privateKey).address;
        } catch (e) {
            return null;
        }
    }

    maskAccount(account) {
        return `${account.substring(0, 6)}******${account.substring(account.length - 6)}`;
    }

    async generatePayload(privateKey, address) {
        const timestamp = Date.now();
        const message = `Sign in to AquaFlux with timestamp: ${timestamp}`;
        const wallet = new ethers.Wallet(privateKey);
        const signature = await wallet.signMessage(message);

        return {
            address: address,
            message: message,
            signature: signature
        };
    }

    async getProvider() {
        // Ethers.js manages provider connections robustly. Proxying RPC is complex and often not needed.
        // We will proxy API calls via axios, which is the more critical part.
        try {
            const provider = new ethers.JsonRpcProvider(this.RPC_URL);
            await provider.getBlockNumber(); // Test connection
            return provider;
        } catch (e) {
            throw new Error(`Failed to connect to RPC: ${e.message}`);
        }
    }

    async sendTransaction(wallet, tx) {
        for (let i = 0; i < 5; i++) {
            try {
                const txResponse = await wallet.sendTransaction(tx);
                const receipt = await txResponse.wait(1); // Wait for 1 confirmation
                if (!receipt) throw new Error("Transaction failed to confirm.");
                return receipt;
            } catch (error) {
                this.log(chalk.yellow(`    Message : [Attempt ${i + 1}] Send TX Error: ${error.message}`));
                await this.sleep(2000 * (i + 1));
            }
        }
        throw new Error("Transaction failed after maximum retries.");
    }
    
    async performApiRequest(config, address, useProxy) {
        for (let i = 0; i < 5; i++) {
            const proxyUrl = useProxy ? this.getNextProxyForAccount(address) : null;
            const instance = this.getAxiosInstance(proxyUrl);
            try {
                const response = await instance(config);
                return response.data;
            } catch (error) {
                if (i < 4) {
                    await this.sleep(3000);
                    continue;
                }
                const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
                throw new Error(errorMessage);
            }
        }
    }
    
    // --- API Methods ---
    
    async walletLogin(privateKey, address, useProxy) {
        const payload = await this.generatePayload(privateKey, address);
        const config = {
            method: 'post',
            url: `${this.BASE_API}/users/wallet-login`,
            headers: { ...this.HEADERS, 'User-Agent': UserAgent(), 'Content-Type': 'application/json' },
            data: payload
        };
        return this.performApiRequest(config, address, useProxy);
    }

    async checkTokenHoldings(address, useProxy) {
        const config = {
            method: 'post',
            url: `${this.BASE_API}/users/check-token-holding`,
            headers: { ...this.HEADERS, 'Authorization': `Bearer ${this.accessTokens[address]}`, 'User-Agent': UserAgent() }
        };
        return this.performApiRequest(config, address, useProxy);
    }
    
    async checkBindingStatus(address, useProxy) {
        const config = {
            method: 'get',
            url: `${this.BASE_API}/users/twitter/binding-status`,
            headers: { ...this.HEADERS, 'Authorization': `Bearer ${this.accessTokens[address]}`, 'User-Agent': UserAgent() }
        };
        return this.performApiRequest(config, address, useProxy);
    }
    
    async getSignature(address, nftType, useProxy) {
        const config = {
            method: 'post',
            url: `${this.BASE_API}/users/get-signature`,
            headers: { ...this.HEADERS, 'Authorization': `Bearer ${this.accessTokens[address]}`, 'User-Agent': UserAgent(), 'Content-Type': 'application/json'},
            data: { walletAddress: address, requestedNftType: nftType }
        };
        return this.performApiRequest(config, address, useProxy);
    }

    // --- On-Chain Methods ---

    async performClaimTokens(privateKey, address, provider) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(this.AQUAFLUX_NFT_ADDRESS, this.AQUAFLUX_CONTRACT_ABI, wallet);
        
        try {
            const tx = {
                to: this.AQUAFLUX_NFT_ADDRESS,
                data: contract.interface.encodeFunctionData("claimTokens"),
                nonce: this.usedNonce[address],
                gasPrice: ethers.parseUnits('1', 'gwei') // simplified gas
            };
            const gasLimit = await wallet.estimateGas(tx);
            tx.gasLimit = gasLimit;
            
            const receipt = await this.sendTransaction(wallet, tx);
            this.usedNonce[address]++;
            return receipt;
        } catch (e) {
            this.log(chalk.red.bold(`    Message : ${e.message}`));
            return null;
        }
    }
    
    async performCombineTokens(privateKey, address, combineOption, provider) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(this.AQUAFLUX_NFT_ADDRESS, this.AQUAFLUX_CONTRACT_ABI, wallet);
        const amount = ethers.parseEther("100");
        
        let functionName;
        if (combineOption === "Combine CS") functionName = "combineCS";
        else if (combineOption === "Combine PC") functionName = "combinePC";
        else functionName = "combinePS";

        try {
            const tx = {
                to: this.AQUAFLUX_NFT_ADDRESS,
                data: contract.interface.encodeFunctionData(functionName, [amount]),
                nonce: this.usedNonce[address],
                gasPrice: ethers.parseUnits('1', 'gwei') // simplified gas
            };
            const gasLimit = await wallet.estimateGas(tx);
            tx.gasLimit = gasLimit;

            const receipt = await this.sendTransaction(wallet, tx);
            this.usedNonce[address]++;
            return receipt;
        } catch (e) {
            this.log(chalk.red.bold(`    Message : ${e.message}`));
            return null;
        }
    }

    async performMintNft(privateKey, address, nftType, signatureData, provider) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(this.AQUAFLUX_NFT_ADDRESS, this.AQUAFLUX_CONTRACT_ABI, wallet);
        
        const { expiresAt, signature } = signatureData;
        try {
            const tx = {
                to: this.AQUAFLUX_NFT_ADDRESS,
                data: contract.interface.encodeFunctionData("mint", [nftType, expiresAt, signature]),
                nonce: this.usedNonce[address],
                gasPrice: ethers.parseUnits('1', 'gwei') // simplified gas
            };
            const gasLimit = await wallet.estimateGas(tx);
            tx.gasLimit = gasLimit;

            const receipt = await this.sendTransaction(wallet, tx);
            this.usedNonce[address]++;
            return receipt;
        } catch (e) {
            this.log(chalk.red.bold(`    Message : ${e.message}`));
            return null;
        }
    }
    
    async checkNftStatus(address, option, provider) {
        const contract = new ethers.Contract(this.AQUAFLUX_NFT_ADDRESS, this.AQUAFLUX_CONTRACT_ABI, provider);
        try {
            if (option === "Standard NFT") {
                return await contract.hasClaimedStandardNFT(address);
            } else {
                return await contract.hasClaimedPremiumNFT(address);
            }
        } catch (e) {
            this.log(chalk.red.bold(`    Message : ${e.message}`));
            return null;
        }
    }

    // --- Process Flow ---
    
    async processAccount(privateKey, address, useProxy) {
        try {
            // 1. Login
            this.log(`Status  : ${chalk.yellow('Attempting to login...')}`);
            const loginData = await this.walletLogin(privateKey, address, useProxy);
            this.accessTokens[address] = loginData.data.accessToken;
            this.log(`Status  : ${chalk.green('Login Success')}`);

            const provider = await this.getProvider();
            this.usedNonce[address] = await provider.getTransactionCount(address, 'pending');

            // 2. Process both NFT types
            for (const nftOption of ["Standard NFT", "Premium NFT"]) {
                console.log(); // Newline for clarity
                this.log(`${chalk.magenta.bold('●')} ${chalk.green.bold(nftOption)}`);
                
                if (nftOption === "Premium NFT") {
                    const binding = await this.checkBindingStatus(address, useProxy);
                    if (!binding?.data?.bound) {
                        this.log(`    Status  : ${chalk.yellow('Not Eligible, Bind Your Twitter First')}`);
                        continue; // Skip to next NFT or finish
                    }
                }
                
                // --- Task: Claim Tokens ---
                this.log(`${chalk.green.bold('●')} ${chalk.blue.bold('Claim Tokens')}`);
                const claimReceipt = await this.performClaimTokens(privateKey, address, provider);
                if (!claimReceipt) continue; // Stop this NFT flow if claim fails
                this.log(`    Status  : ${chalk.green('Success')}`);
                this.log(`    Tx Hash : ${chalk.white(claimReceipt.hash)}`);
                await this.printTimer(10);
                
                // --- Task: Combine Tokens ---
                this.log(`${chalk.green.bold('●')} ${chalk.blue.bold('Combine Tokens')}`);
                let holdings = await this.checkTokenHoldings(address, useProxy);
                if (holdings?.data?.isHoldingToken) {
                    this.log(`    Status  : ${chalk.green('Already Combined')}`);
                } else {
                    const combineOptions = ["Combine CS", "Combine PC", "Combine PS"];
                    const combineOption = combineOptions[Math.floor(Math.random() * combineOptions.length)];
                    const combineReceipt = await this.performCombineTokens(privateKey, address, combineOption, provider);
                    if (!combineReceipt) continue; // Stop this flow
                    this.log(`    Status  : ${chalk.green('Success')}`);
                    this.log(`    Tx Hash : ${chalk.white(combineReceipt.hash)}`);
                }
                await this.printTimer(10);
                
                // --- Task: Mint NFT ---
                this.log(`${chalk.green.bold('●')} ${chalk.blue.bold('Mint NFT')}`);
                const hasClaimed = await this.checkNftStatus(address, nftOption, provider);
                if (hasClaimed) {
                    this.log(`    Status  : ${chalk.yellow(`${nftOption} Already Minted`)}`);
                } else {
                    const nftType = (nftOption === "Standard NFT") ? 0 : 1;
                    const signatureData = await this.getSignature(address, nftType, useProxy);
                    if (!signatureData?.data) {
                        this.log(`    Message : ${chalk.red.bold(signatureData?.message || 'Failed to get signature')}`);
                        continue;
                    }
                    const mintReceipt = await this.performMintNft(privateKey, address, nftType, signatureData.data, provider);
                    if (!mintReceipt) continue;
                    this.log(`    Status  : ${chalk.green(`Mint ${nftOption} Success`)}`);
                    this.log(`    Tx Hash : ${chalk.white(mintReceipt.hash)}`);
                }
                await this.printTimer(10);
            }
        } catch (error) {
            this.log(`Status  : ${chalk.red.bold('An error occurred during processing:')} ${chalk.yellow(error.message)}`);
        }
    }

    async printTimer(duration) {
        for (let i = duration; i > 0; i--) {
            process.stdout.write(chalk.blue(`Waiting for ${i} seconds for the next transaction... \r`));
            await this.sleep(1000);
        }
        process.stdout.write(" ".repeat(50) + "\r"); // Clear the line
    }

    async askQuestions() {
        console.log(chalk.white.bold("1. Run With Free Proxyscrape Proxy"));
        console.log(chalk.white.bold("2. Run With Private Proxy (from proxy.txt)"));
        console.log(chalk.white.bold("3. Run Without Proxy"));
        let choice;
        while (![1, 2, 3].includes(choice)) {
            const answer = await question(chalk.blue.bold("Choose [1/2/3] -> "));
            choice = parseInt(answer.trim(), 10);
        }
        return choice;
    }

    async main() {
        try {
            const accounts = (await fs.readFile('accounts.txt', 'utf-8')).split('\n').map(l => l.trim()).filter(Boolean);
            if (!accounts.length) {
                this.log(chalk.red.bold("File 'accounts.txt' is empty or not found."));
                return;
            }

            const useProxyChoice = await this.askQuestions();
            const useProxy = useProxyChoice === 1 || useProxyChoice === 2;
            
            this.clearTerminal();
            this.welcome();
            this.log(chalk.green.bold("Accounts Total: ") + chalk.white.bold(accounts.length));
            
            if (useProxy) {
                await this.loadProxies(useProxyChoice);
            }

            const separator = "=".repeat(25);
            for (const privateKey of accounts) {
                const address = this.generateAddress(privateKey);
                this.log(chalk.cyan.bold(`${separator}[`) + chalk.white.bold(` ${this.maskAccount(address)} `) + chalk.cyan.bold(`]${separator}`));
                if (!address) {
                    this.log(chalk.red.bold("Status  : Invalid Private Key."));
                    continue;
                }
                
                await this.processAccount(privateKey, address, useProxy);
                this.log(chalk.cyan.bold('='.repeat(72)));
                await this.sleep(5000); // Wait 5 seconds between accounts
            }

            this.log(chalk.green.bold("All accounts have been processed. The script will wait 24 hours before the next run."));
            let seconds = 24 * 60 * 60;
            while (seconds > 0) {
                process.stdout.write(chalk.cyan.bold(`[ Waiting for ${this.formatSeconds(seconds)}... ]\r`));
                await this.sleep(1000);
                seconds--;
            }
            // Optionally, restart the process here.
            // await this.main();

        } catch (error) {
            this.log(chalk.red.bold(`A critical error occurred: ${error.message}`));
        } finally {
            rl.close();
        }
    }
}

// Entry Point
(async () => {
    const bot = new AquaFlux();
    try {
        await bot.main();
    } catch (e) {
        console.error("Bot failed to run.", e);
    }
})();
