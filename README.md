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

1. **Execution Analysis**  
- Run `/register`, `/users/:id/deposit`, and `/users/:id/proof`. Why does the `points` value in `/users/:id/proof` behave unexpectedly, and what causes it?

2. **Bug Identification**  
- Find and fix the bug in `/users/:id/proof` where `randomNum` isn’t converted from BigInt, causing type errors. Submit corrected code and explain.

3. **Debugging Process**  
- After `/users/:id/deposit`, verify if `balance` updates correctly. Describe your debugging steps if it doesn’t reflect the input `amount`.

4. **Complexity Enhancement**  
- Propose adding a feature to validate Merkle proofs on-chain. Provide sample code.
