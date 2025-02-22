require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Konfigurasi Nexus RPC
const RPC_URL = "https://rpc.nexus.xyz/http";
const CHAIN_ID = 392;
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Ambil private key dari .env
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("❌  PRIVATE_KEY tidak ditemukan di .env");
  process.exit(1);
}

// Buat wallet dari private key
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
console.log(`✅  Menggunakan alamat pengirim: ${wallet.address}`);

// Baca daftar penerima dari file
const recipientsFile = path.join(__dirname, "recipients.txt");
if (!fs.existsSync(recipientsFile)) {
  console.error("❌  File recipients.txt tidak ditemukan!");
  process.exit(1);
}
const recipients = fs.readFileSync(recipientsFile, "utf8").split("\n").map(addr => addr.trim()).filter(addr => addr);

// Jumlah Token yang Akan Dikirim ke Setiap Penerima
const AMOUNT_TO_SEND = ethers.parseEther("1"); // 1 NEX

async function sendToken(receiver) {
  try {
    const gasPrice = await provider.getFeeData();
    const nonce = await provider.getTransactionCount(wallet.address);
    
    const tx = {
      to: receiver,
      value: AMOUNT_TO_SEND,
      gasLimit: 21000,
      gasPrice: gasPrice.gasPrice,
      nonce,
      chainId: CHAIN_ID
    };

    const signedTx = await wallet.sendTransaction(tx);
    console.log(`✅  1 NEX terkirim ke ${receiver}! TX Hash: ${signedTx.hash}`);
  } catch (error) {
    console.error(`❌  Gagal mengirim ke ${receiver}:`, error.message);
  }
}

async function main() {
  for (const recipient of recipients) {
    console.log(`🔹 Mengirim 1 NEX ke: ${recipient}`);
    await sendToken(recipient);
    console.log("⏳  Menunggu 60 detik sebelum transaksi berikutnya...");
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

main();
