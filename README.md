# test-node : User Management with Merkle Proofs and Crypto Utilities

This project simulates a DeFi platform with user registration, deposits, and Merkle proof generation.
**Intentional bugs are included, requiring execution and debugging to submit correct answers.**

## Source Code

- **File**: `app.js`

## Prerequisites

- **Node.js**: v16+
- **Environment**: Infura ID, Gmail credentials, Redis on `localhost:6379`

## Setup

1. `npm install`
2. Set `.env`:

```
	INFURA_PROJECT_ID=your-id
	GMAIL_USER=your-email
	GMAIL_PASS=your-pass
```

3. `redis-server`
4. `node beginner.js`

## Problems and Questions

**All answers require running and debugging the code due to intentional bugs.**

**Steps to set up repository**
1. `npm i`
2. Redis on `docker run -d --name redis-server -p 6379:6379 redis`
3. Create `.env` with appropriate values.
4. Use Postman to run the endpoints. They should run fine.


1. **Execution Analysis**

- Run `/register`, `/users/:id/deposit`, and `/users/:id/proof`. Why does the `points` value in `/users/:id/proof` behave unexpectedly, and what causes it?

- ANSWER: After calling /register, /deposit, and /proof, the points value behaves unexpectedly.
  Cause: randomNum generated in /proof is a BigInt. When adding it to points (which is a Number), JS throws a silent type mismatch or results in NaN.
  This causes the final points value to be invalid or unpredictable.
  Logs rom user_activity.log -
  `{"level":"info","message":{"event":"proof_generated","points":960,"proof":[{"data":{"data":[235,174,100,43,247,26,65,92,228,104,60,178,196,126,177,121,9,87,98,6,237,1,248,163,19,64,245,230,114,210,226,19],"type":"Buffer"},"position":"right"}],"userId":"217874ea-b954-4450-bd3c-e3ac26288f68"},"timestamp":"2025-04-28T15:13:21.067Z"}`

2. **Bug Identification**

- Find and fix the bug in `/users/:id/proof` where `randomNum` isn’t converted from BigInt, causing type errors. Submit corrected code and explain.

- ANSWER:
  Buggy Code:

  ```
  const randomNum = await bigintCryptoUtils.randBetween(1n, 1000n);
  user.points = ACTIVITY_POINTS.proof + randomNum;
  ```

  Fixed Code:

  ```
  const randomNum = bigintCryptoUtils.randBetween(1000n, 1n);
  user.points = ACTIVITY_POINTS.proof + Number(randomNum);
  ```

  Why It Works:
  randomNum is BigInt. Adding it to a Number causes type mismatch.
  Number(randomNum) safely converts it to a number, making addition valid.
  Now points reflects correct logic: base points + secure random bonus.

  Reference why I reversed the arguments of `randBetween` - https://github.com/juanelas/bigint-crypto-utils/blob/main/docs/API.md#randbetween

3. **Debugging Process**

- After `/users/:id/deposit`, verify if `balance` updates correctly. Describe your debugging steps if it doesn’t reflect the input `amount`.

- ANSWER:
  Steps to Debug:
  Initial Check – Log Old and New Balance
  I added a console.log or used the existing logger to print the balance before and after the deposit:

  ```
  console.log("Old balance:", user.balance);
  user.balance += amount;
  console.log("New balance:", user.balance);
  ```

  After adding the deposit log:
  `logger.info({ event: 'deposit', userId: user.id, amount });`
  I confirmed from the log output:

  ```
  Old balance: 0
  New balance: 100
  {"level":"info","message":{"amount":100,"event":"deposit","userId":"5e9a2e80-ff7c-47be-9c83-89425714e698"}}
  ```

  This validated that the balance was being updated cumulatively and correctly.

4. **Complexity Enhancement**

- Propose adding a feature to validate Merkle proofs on-chain. Provide sample code.

- ANSWER:
  Add a smart contract to verify Merkle proofs on-chain.

  ```
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.0;

  library MerkleProof {
  	function verify(
  		bytes32[] memory proof,
  		bytes32 root,
  		bytes32 leaf
  	) internal pure returns (bool) {
  		bytes32 computedHash = leaf;
  		for (uint256 i = 0; i < proof.length; i++) {
  			computedHash = computedHash < proof[i] ? keccak256(abi.encodePacked(computedHash, proof[i])) : keccak256(abi.encodePacked(proof[i], computedHash));
  		}
  	return computedHash == root;
  	}
  }

  ```

  Merkle Proof: The proof array contains the hashes required to traverse the Merkle tree, from the leaf node to the root.

  Validation: The verifyMerkleProof function calculates the hash from the leaf to the root and checks if the final computed hash matches the given root. If it does, the proof is valid.

  You can combine this with a frontend or server-side call to ensure that wallet proofs are valid before deposit rewards or airdrop claims.
