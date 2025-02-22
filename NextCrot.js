const { ethers } = require("ethers");
const fs = require("fs");
const dotenv = require("dotenv");
const chalk = require("chalk");
const readline = require("readline");

dotenv.config();

const provider = new ethers.JsonRpcProvider("https://rpc.nexus.xyz/http");
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  console.log(chalk.red("❌ PRIVATE_KEY tidak ditemukan di .env!"));
  process.exit(1);
}

const wallet = new ethers.Wallet(privateKey, provider);
console.log(chalk.green(`✅ Menggunakan alamat pengirim: ${wallet.address}`));

const recipients = fs.readFileSync("recipients.txt", "utf-8").split("\n").map(addr => addr.trim()).filter(addr => addr);

if (recipients.length === 0) {
  console.log(chalk.red("❌ Daftar penerima kosong!"));
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(chalk.yellow("Masukkan waktu tunda antar transaksi (detik): "), async (delay) => {
  const delaySeconds = parseInt(delay) || 60;
  console.log(chalk.blue(`⏳ Waktu tunda diset ke ${delaySeconds} detik`));

  for (const recipient of recipients) {
    try {
      console.log(chalk.yellow(`🔹 Mengirim 1 NEX ke: ${recipient}`));
      const tx = await wallet.sendTransaction({
        to: recipient,
        value: ethers.parseEther("1")
      });
      console.log(chalk.green(`✅ 1 NEX terkirim ke ${recipient}! TX Hash: ${tx.hash}`));
    } catch (error) {
      console.log(chalk.red(`❌ Gagal mengirim ke ${recipient}: ${error.message}`));
    }
    console.log(chalk.gray(`⏳ Menunggu ${delaySeconds} detik sebelum transaksi berikutnya...`));
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
  }
  console.log(chalk.green("🎉 Semua transaksi selesai!"));
  rl.close();
});
