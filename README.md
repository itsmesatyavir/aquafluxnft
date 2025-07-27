# AquaFlux NFT Bot 🤖

This is a Node.js bot designed to automate interactions with the **AquaFlux NFT testnet**. It performs a series of on-chain and API tasks for multiple accounts, including claiming tokens, combining them, and minting both Standard and Premium NFTs.

![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18.x+-green.svg)

---

## Features

-   **Multi-Account Support**: Runs tasks for all private keys listed in `accounts.txt`.
-   **Automated Task Flow**: For each account, the bot performs the following sequence:
    1.  Logs into the AquaFlux API.
    2.  **Claims** testnet tokens.
    3.  **Combines** tokens to meet holding requirements.
    4.  **Mints** the Standard NFT.
    5.  **Mints** the Premium NFT (if the account is eligible).
-   **Proxy Support**: Flexible proxy integration with three modes:
    1.  Free public proxies (fetched automatically).
    2.  Private proxies from `proxy.txt`.
    3.  No proxy.
-   **Error Handling & Retries**: Includes robust error handling and retries for both API requests and blockchain transactions.
-   **Scheduled Execution**: After processing all accounts, the bot waits for 24 hours before a potential next run.

---

## 🛠️ Setup & Installation

Follow these steps to set up and run the bot.

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 18.x or higher is recommended).
-   `npm` (Node Package Manager), which comes with Node.js.
-   [Git](https://git-scm.com/)

### 1. Clone the Repository

First, clone this repository to your local machine.

```bash
git clone https://github.com/itsmesatyavir/aquafluxnft.git
cd aquafluxnft
```

2. Install Dependencies
Install the required npm packages by running the following command in the project's root directory:
```bash
npm install
```

3. Configure Accounts
Create a file named accounts.txt in the root of the project folder. Add your wallet private keys to this file, with each key on a new line.
accounts.txt example:
```bash
0x...
0x...
```
4. Configure Proxies (Optional)
If you plan to use private proxies, create a file named proxy.txt in the root directory. Add your proxies to this file, one per line.
```Supported Formats:
 * http://host:port
 * http://user:pass@host:port
 * socks5://user:pass@host:port
```
   
🚀 How to Run
Once the setup is complete, you can start the bot using the following command:
```bash
npm start
```
Alternatively, you can run it directly with Node:
```bash
node index.js
```
The script will prompt you to choose a proxy mode, and then it will begin processing the accounts from your accounts.txt file.

📜 License
This project is licensed under the MIT License. See the LICENSE file for more details.

⚠️ Disclaimer
This script is provided for educational purposes only. The use of automation tools may be against the terms of service of the platform. Use it at your own risk. The author is not responsible for any loss of funds or other damages.

