const { ethers } = require("ethers");
const fs = require("fs");
const dotenv = require("dotenv");
const chalk = require("chalk");
const readline = require("readline");
const axios = require("axios");

dotenv.config();

(async () => {
  const ora = (await import("ora")).default;

  console.log(chalk.cyan(`
    ██████ ▄▄▄     ▄▄▄      ███▄    █▓█████▓██   ██▓
  ▒██    ▒▒████▄  ▒████▄    ██ ▀█   █▒██▀ ██▒██  ██▒
  ░ ▓██▄  ▒██  ▀█▄▒██  ▀█▄ ▓██  ▀█ ██░██   █▌▒██ ██░
    ▒   ██░██▄▄▄▄█░██▄▄▄▄██▓██▒  ▐▌██░▓█▄   ▌░ ▐██▓░
  ▒██████▒▒▓█   ▓██▓█   ▓██▒██░   ▓██░▒████▓ ░ ██▒▓░
  ▒ ▒▓▒ ▒ ░▒▒   ▓▒█▒▒   ▓▒█░ ▒░   ▒ ▒ ▒▒▓  ▒  ██▒▒▒ 
  ░ ░▒  ░ ░ ▒   ▒▒ ░▒   ▒▒ ░ ░░   ░ ▒░░ ▒  ▒▓██ ░▒░ 
  ░  ░  ░   ░   ▒   ░   ▒     ░   ░ ░ ░ ░  ░▒ ▒ ░░  
        ░       ░  ░    ░  ░        ░   ░   ░ ░     
                                      ░     ░ ░     
  `));

  const provider = new ethers.JsonRpcProvider("https://rpc.nexus.xyz/http");
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    console.log(chalk.red("❌ PRIVATE_KEY tidak ditemukan di .env!"));
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(chalk.green(`✅ Menggunakan alamat pengirim: ${wallet.address}`));

  async function getAccountInfo(address) {
    try {
      const response = await axios.get(`https://explorer.nexus.xyz/api?module=account&action=balance&address=${address}`);
      const balance = ethers.formatEther(response.data.result);
      console.log(chalk.blue(`💰 Saldo: ${balance} NEX`));
    } catch (error) {
      console.log(chalk.red("❌ Gagal mengambil saldo!"));
    }

    try {
      const response = await axios.get(`https://explorer.nexus.xyz/api?module=account&action=txlist&address=${address}`);
      const txCount = response.data.result.length;
      console.log(chalk.blue(`📜 Total transaksi: ${txCount}`));
    } catch (error) {
      console.log(chalk.red("❌ Gagal mengambil jumlah transaksi!"));
    }
  }

  await getAccountInfo(wallet.address);

  const recipients = fs.readFileSync("recipients.txt", "utf-8").split("\n").map(addr => addr.trim()).filter(addr => addr);

  if (recipients.length === 0) {
    console.log(chalk.red("❌ Daftar penerima kosong!"));
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  async function sendTransactions(amount, delaySeconds) {
    while (true) {
      for (const recipient of recipients) {
        try {
          console.log(chalk.yellow(`🔹 Mengirim ${amount} NEX ke: ${recipient}`));
          const tx = await wallet.sendTransaction({
            to: recipient,
            value: ethers.parseEther(amount.toString())
          });
          console.log(chalk.green(`✅ ${amount} NEX terkirim ke ${recipient}! TX Hash: ${tx.hash}`));
        } catch (error) {
          console.log(chalk.red(`❌ Gagal mengirim ke ${recipient}: ${error.message}`));
        }

        console.log(chalk.gray(`⏳ Menunggu ${delaySeconds} detik sebelum transaksi berikutnya...`));
        const spinner = ora({ text: 'Menunggu...', spinner: 'dots' }).start();
        for (let i = delaySeconds; i > 0; i--) {
          spinner.text = `⏳ Menghitung mundur: ${i} detik...`;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        spinner.stop();
      }

      console.log(chalk.green("🎉 Semua transaksi selesai! Menunggu 24 jam sebelum mulai ulang..."));
      for (let i = 24 * 60 * 60; i > 0; i -= 10) {
        console.log(chalk.magenta(`⏳ Menghitung mundur: ${i} detik...`));
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  rl.question(chalk.yellow("Masukkan jumlah NEX yang akan dikirim: "), (amount) => {
    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      console.log(chalk.red("❌ Jumlah NEX tidak valid!"));
      rl.close();
      return;
    }

    rl.question(chalk.yellow("Masukkan waktu tunda antar transaksi (detik): "), (delay) => {
      const delaySeconds = parseInt(delay);
      if (isNaN(delaySeconds) || delaySeconds < 1) {
        console.log(chalk.red("❌ Waktu tunda tidak valid!"));
        rl.close();
        return;
      }

      console.log(chalk.blue(`⏳ Waktu tunda diset ke ${delaySeconds} detik`));
      rl.close();
      sendTransactions(sendAmount, delaySeconds);
    });
  });
})();
