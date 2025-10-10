// File: /api/execute-trade.js

// Note: 'dotenv' is only for local testing. Vercel uses its own Environment Variables.
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }
  
  const { createWalletClient, http, parseEther } = require('viem');
  const { privateKeyToAccount } = require('viem/accounts');
  const { mainnet } = require('viem/chains'); // Or your target chain
  
  // The handler for the serverless function
  export default async function handler(req, res) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  
    // 2. Get trade data from request body
    const { to, value, data } = req.body;
    if (!to || !value) {
      return res.status(400).json({ error: 'Missing "to" or "value" in request body' });
    }
  
    try {
      // 3. Securely load private key from Environment Variables
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
          throw new Error("PRIVATE_KEY is not set in environment variables.");
      }
      const account = privateKeyToAccount(privateKey);
  
      // 4. Setup viem client
      const client = createWalletClient({
        account,
        chain: mainnet,
        transport: http(), // IMPORTANT: For production, use a dedicated RPC provider like Alchemy or Infura
      });
  
      // 5. Send the transaction
      console.log(`Executing trade: To=${to}, Value=${value}`);
      const txHash = await client.sendTransaction({
        to: to,
        value: parseEther(value), // Assuming 'value' is sent as a string like "0.01" ETH
        data: data,
      });
  
      console.log('Transaction sent! Hash:', txHash);
      return res.status(200).json({ success: true, transactionHash: txHash });
  
    } catch (error) {
      console.error('Transaction failed:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }