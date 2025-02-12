import { Wallet, utils } from 'ethers';
import { input, password } from '@inquirer/prompts';
import { promises as fs } from 'fs';

async function createKeystoreJson() {
  const filePath = await input({
    message: 'Enter path to save file',
  });
  if (!filePath) {
    console.error('Error: Please enter a valid file path.');
    return;
  }

  const key = await input({
    message: 'Enter your private key or mnemonic',
    transformer: (value, { isFinal }) => {
      if (!isFinal) return value;
      return '';
    },
  });
  const isMnemonic = utils.isValidMnemonic(key);

  if (isMnemonic) {
    console.log('Entered a Mnemonic phrase');
  } else {
    console.log('Entered a private key');
  }

  let wallet: Wallet | undefined = undefined;
  try {
    wallet = isMnemonic ? Wallet.fromMnemonic(key) : new Wallet(key);
  } catch (error) {
    console.error(
      `Error: Failed to create wallet from entered ${isMnemonic ? 'mnemonic' : 'private key'}.`
    );
    return;
  }

  const pswd = await password({
    message: 'Please enter your keystore password',
    mask: '*',
  });
  const jsonKeystore = await wallet.encrypt(pswd);

  await fs.writeFile(filePath, jsonKeystore, { flag: 'w' });
  console.log(
    `Saved wallet with address: ${wallet.address} to encrypted file: ${filePath}`
  );
}

createKeystoreJson();
