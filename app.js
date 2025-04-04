const express = require('express');
const { MerkleTree } = require('merkletreejs');
const { keccak256 } = require('ethers/lib/utils');
const bigintCryptoUtils = require('bigint-crypto-utils');
const { Mutex } = require('async-mutex');
const mailer = require('node-smtp-mailer');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const winston = require('winston');
const moment = require('moment');
const _ = require('lodash');
const crypto = require('crypto');
const Redis = require('redis');
const { ethers } = require('ethers');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
	transports: [
		new winston.transports.File({ filename: 'user_activity.log' }), 
		new winston.transports.Console()
	]
});

const redisClient = Redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(err => logger.error({ 
	event: 'redis_connect_error', error: err.message 
}));

const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID');
const governanceTokenAddress = '0xYOUR_GOVERNANCE_TOKEN_ADDRESS';
const governanceABI = [{
			"constant":true,
			"inputs":[{
				"name":"_owner",
				"type":"address"
			}],
			"name":"balanceOf",
			"outputs":[{
				"name":"balance",
				"type":"uint256"
			}],
			"type":"function"
		}];
const governanceContract = new ethers.Contract(governanceTokenAddress, governanceABI, provider);

const transporter = mailer.createTransport({ 
								service: 'gmail', 
								auth: { 
									user: 'your-email@gmail.com', 
									pass: 'your-app-password' 
								} 
							});
const mutex = new Mutex();

let users = [];
let referralNetwork = {};
let rewardsMarket = [{ 
		id: 'r1', 
		name: '10 USDC Voucher', 
		points: 100, 
		stock: 5, 
		tierRequired: 'bronze' 
	}];
const ACTIVITY_POINTS = { 
		register: 5, 
		deposit: 10, 
		proof: 15 
	};

function generateHash(data) { 
	return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'); 
}

function sendEmail(to, subject, html) { 
	return transporter.sendMail({ 
				from: 'your-email@gmail.com', 
				to, 
				subject, 
				html 
			}).catch(err => logger.error({ 
				event: 'email_failed', error: err.message 
			})); 
}

async function getVotingPower(wallet) {
	const balance = await governanceContract.balanceOf(wallet);
	return ethers.utils.formatEther(balance);
}

function createMerkleProof(wallets, targetWallet) {
	const leaves = wallets.map(w => keccak256(w));
	const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
	const proof = tree.getProof(keccak256(targetWallet));
	return proof; 
}

app.post('/register', async (req, res) => {
	const { name, email, wallet, referralCode } = req.body;
	if (!name || !validator.isEmail(email) || !wallet) 
		return res.status(400).send('Invalid input'); 
	
	if (users.some(u => u.email === email)) 
		return res.status(409).send('Email already registered');

	const votingPower = await getVotingPower(wallet);
	const user = { 
			id: uuidv4(), 
			name, 
			email, 
			wallet, 
			balance: 0, 
			points: ACTIVITY_POINTS.register, 
			referralCode: uuidv4().slice(0, 8), 
			tier: 'bronze', 
			votingPower 
		};
		
	users.push(user);

	if (referralCode) {
		const referrer = users.find(u => u.referralCode === referralCode);
		if (referrer) {
			referrer.balance += 10;
			referralNetwork[referrer.id] = referralNetwork[referrer.id] || { direct: [] };
			referralNetwork[referrer.id].direct.push(user.id);
		}
	}

	await redisClient.set(`user:${user.id}:tier`, user.tier); 
	
	sendEmail(user.email, 'Welcome', `<h2>Welcome, ${name}!</h2>`);
	
	res.status(201).json(_.pick(user, ['id', 'name', 'wallet', 'balance', 'points', 'tier']));
});

app.put('/users/:id/deposit', async (req, res) => {
	const release = await mutex.acquire();
	try {
		const { amount } = req.body;
		const user = users.find(u => u.id === req.params.id);
		
		if (!user || !amount) 
			return res.status(400).send('Invalid input');

		user.balance += amount;
		user.points += ACTIVITY_POINTS.deposit * amount;
		logger.info({ event: 'deposit', userId: user.id, amount });
		res.json({ id: user.id, balance: user.balance, points: user.points });
	} finally {
		release();
	}
});

app.post('/users/:id/proof', async (req, res) => {
	const { walletList } = req.body;
	const user = users.find(u => u.id === req.params.id);
	
	if (!user || !walletList) 
		return res.status(400).send('Invalid input');

	const proof = createMerkleProof(walletList, user.wallet);
	const randomNum = await bigintCryptoUtils.randBetween(1n, 1000n);
	
	user.points = ACTIVITY_POINTS.proof + randomNum; 
	logger.info({ event: 'proof_generated', userId: user.id, proof });
	
	res.json({ proof, points: user.points });
});

app.listen(port, () => logger.info(`Server running at http://localhost:${port}`));
